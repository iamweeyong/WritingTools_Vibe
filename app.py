import json
import os
import re
import sqlite3
from datetime import datetime
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).parent
DB_PATH = ROOT / "writingtools.db"
SCHEMA_PATH = ROOT / "schema.sql"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_conn()
    conn.executescript(SCHEMA_PATH.read_text())
    conn.commit()
    conn.close()


def row_dict(row):
    return dict(row) if row else None


def json_response(handler, payload, code=200):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(code)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def read_json(handler):
    length = int(handler.headers.get("Content-Length", 0))
    if not length:
        return {}
    raw = handler.rfile.read(length)
    return json.loads(raw.decode("utf-8"))


def now_iso():
    return datetime.utcnow().isoformat()


WIKILINK_RE = re.compile(r"\[\[([^\]]+)\]\]")


class ApiHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = path.split("?", 1)[0]
        if path == "/":
            path = "/static/index.html"
        return str(ROOT / path.lstrip("/"))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if not path.startswith("/api/"):
            return super().do_GET()

        conn = get_conn()
        try:
            if path == "/api/projects":
                rows = conn.execute("SELECT * FROM projects ORDER BY id DESC").fetchall()
                return json_response(self, [row_dict(r) for r in rows])

            if path.startswith("/api/projects/") and path.endswith("/scenes"):
                pid = path.split("/")[3]
                rows = conn.execute(
                    "SELECT * FROM scenes WHERE project_id=? AND deleted_at IS NULL ORDER BY position,id",
                    (pid,),
                ).fetchall()
                return json_response(self, [row_dict(r) for r in rows])

            if path == "/api/notes":
                rows = conn.execute("SELECT * FROM notes ORDER BY updated_at DESC").fetchall()
                return json_response(self, [row_dict(r) for r in rows])

            if path.startswith("/api/notes/backlinks/"):
                note_id = int(path.split("/")[-1])
                target = conn.execute("SELECT * FROM notes WHERE id=?", (note_id,)).fetchone()
                if not target:
                    return json_response(self, {"error": "note not found"}, 404)
                title = target["title"]
                rows = conn.execute("SELECT id,title,body FROM notes WHERE id<>?", (note_id,)).fetchall()
                backlinks = [row_dict(r) for r in rows if f"[[{title}]]" in (r["body"] or "")]
                return json_response(self, backlinks)

            if path.startswith("/api/outputs/"):
                oid = int(path.split("/")[-1])
                out = conn.execute("SELECT * FROM outputs WHERE id=?", (oid,)).fetchone()
                if not out:
                    return json_response(self, {"error": "output not found"}, 404)
                src = conn.execute(
                    """
                    SELECT os.id, os.section, n.id as note_id, n.title
                    FROM output_sources os
                    JOIN notes n ON n.id=os.note_id
                    WHERE os.output_id=? ORDER BY os.id
                    """,
                    (oid,),
                ).fetchall()
                data = row_dict(out)
                data["sources"] = [row_dict(r) for r in src]
                return json_response(self, data)

            if path == "/api/outputs":
                rows = conn.execute("SELECT * FROM outputs ORDER BY id DESC").fetchall()
                return json_response(self, [row_dict(r) for r in rows])

            if path == "/api/research/topics":
                rows = conn.execute("SELECT * FROM research_topics ORDER BY id DESC").fetchall()
                return json_response(self, [row_dict(r) for r in rows])

            if path.startswith("/api/research/topics/") and path.endswith("/briefs"):
                topic_id = int(path.split("/")[4])
                rows = conn.execute(
                    "SELECT * FROM research_briefs WHERE topic_id=? ORDER BY id DESC", (topic_id,)
                ).fetchall()
                return json_response(self, [row_dict(r) for r in rows])

            if path.startswith("/api/scenes/") and path.endswith("/context"):
                sid = int(path.split("/")[3])
                scene = conn.execute("SELECT * FROM scenes WHERE id=?", (sid,)).fetchone()
                if not scene:
                    return json_response(self, {"notes": [], "briefs": []})
                text = f"{scene['slugline'] or ''}\n{scene['body'] or ''}"
                titles = {m.group(1).strip() for m in WIKILINK_RE.finditer(text)}
                notes = []
                if titles:
                    q = ",".join("?" for _ in titles)
                    notes = conn.execute(
                        f"SELECT id,title,is_moc FROM notes WHERE title IN ({q})", tuple(titles)
                    ).fetchall()
                briefs = conn.execute(
                    """
                    SELECT rb.* FROM scene_briefs sb
                    JOIN research_briefs rb ON rb.id=sb.brief_id
                    WHERE sb.scene_id=?
                    """,
                    (sid,),
                ).fetchall()
                return json_response(
                    self,
                    {
                        "notes": [row_dict(r) for r in notes],
                        "briefs": [row_dict(r) for r in briefs],
                    },
                )

            return json_response(self, {"error": "not found"}, 404)
        finally:
            conn.close()

    def do_POST(self):
        path = urlparse(self.path).path
        if not path.startswith("/api/"):
            return json_response(self, {"error": "api only"}, 404)
        data = read_json(self)
        conn = get_conn()
        try:
            if path == "/api/projects":
                cur = conn.execute(
                    "INSERT INTO projects(name,type,created_at) VALUES (?,?,?)",
                    (data.get("name", "Untitled Project"), data.get("type", "screenplay"), now_iso()),
                )
                conn.commit()
                row = conn.execute("SELECT * FROM projects WHERE id=?", (cur.lastrowid,)).fetchone()
                return json_response(self, row_dict(row), 201)

            if path.startswith("/api/projects/") and path.endswith("/bootstrap-screenplay"):
                pid = int(path.split("/")[3])
                templates = [
                    "Opening Image", "Theme Stated", "Set-up", "Catalyst", "Debate",
                    "Break into Two", "B Story", "Fun and Games", "Midpoint", "Finale"
                ]
                for i, t in enumerate(templates, start=1):
                    conn.execute(
                        "INSERT INTO scenes(project_id,title,slugline,body,position) VALUES (?,?,?,?,?)",
                        (pid, t, f"INT. LOCATION {i} - DAY", "", i),
                    )
                conn.commit()
                return json_response(self, {"created": len(templates)})

            if path.startswith("/api/projects/") and path.endswith("/scenes"):
                pid = int(path.split("/")[3])
                pos = conn.execute("SELECT COALESCE(MAX(position),0)+1 FROM scenes WHERE project_id=?", (pid,)).fetchone()[0]
                cur = conn.execute(
                    "INSERT INTO scenes(project_id,title,slugline,body,position) VALUES (?,?,?,?,?)",
                    (pid, data.get("title", "New Scene"), data.get("slugline", ""), data.get("body", ""), pos),
                )
                conn.commit()
                row = conn.execute("SELECT * FROM scenes WHERE id=?", (cur.lastrowid,)).fetchone()
                return json_response(self, row_dict(row), 201)

            if path.startswith("/api/projects/") and path.endswith("/scenes/reorder"):
                ids = data.get("ids", [])
                for idx, sid in enumerate(ids, start=1):
                    conn.execute("UPDATE scenes SET position=? WHERE id=?", (idx, sid))
                conn.commit()
                return json_response(self, {"ok": True})

            if path == "/api/notes":
                cur = conn.execute(
                    "INSERT INTO notes(title,body,is_moc,topic_id,created_at,updated_at) VALUES (?,?,?,?,?,?)",
                    (
                        data.get("title", "Untitled Note"),
                        data.get("body", ""),
                        int(bool(data.get("is_moc", False))),
                        data.get("topic_id"),
                        now_iso(),
                        now_iso(),
                    ),
                )
                conn.commit()
                row = conn.execute("SELECT * FROM notes WHERE id=?", (cur.lastrowid,)).fetchone()
                return json_response(self, row_dict(row), 201)

            if path.startswith("/api/outputs/from-moc/"):
                note_id = int(path.split("/")[-1])
                moc = conn.execute("SELECT * FROM notes WHERE id=?", (note_id,)).fetchone()
                if not moc or not moc["is_moc"]:
                    return json_response(self, {"error": "MOC note required"}, 400)
                titles = [m.group(1).strip() for m in WIKILINK_RE.finditer(moc["body"] or "")]
                linked = []
                if titles:
                    q = ",".join("?" for _ in titles)
                    linked = conn.execute(f"SELECT * FROM notes WHERE title IN ({q})", tuple(titles)).fetchall()
                body_parts = [f"# Synopsis Board: {moc['title']}", ""]
                for n in linked:
                    body_parts.append(f"## {n['title']}")
                    body_parts.append((n["body"] or "")[:300])
                    body_parts.append("")
                cur = conn.execute(
                    "INSERT INTO outputs(title,body,type,source_note_id,created_at) VALUES (?,?,?,?,?)",
                    (f"{moc['title']} - Synopsis", "\n".join(body_parts), "synopsis_board", note_id, now_iso()),
                )
                output_id = cur.lastrowid
                for n in linked:
                    conn.execute(
                        "INSERT INTO output_sources(output_id,section,note_id) VALUES (?,?,?)",
                        (output_id, n["title"], n["id"]),
                    )
                conn.commit()
                row = conn.execute("SELECT * FROM outputs WHERE id=?", (output_id,)).fetchone()
                return json_response(self, row_dict(row), 201)

            if path == "/api/research/topics":
                cur = conn.execute(
                    "INSERT INTO research_topics(name,description,created_at) VALUES (?,?,?)",
                    (data.get("name", "Untitled Topic"), data.get("description", ""), now_iso()),
                )
                conn.commit()
                row = conn.execute("SELECT * FROM research_topics WHERE id=?", (cur.lastrowid,)).fetchone()
                return json_response(self, row_dict(row), 201)

            if path == "/api/research/briefs":
                cur = conn.execute(
                    """
                    INSERT INTO research_briefs(topic_id,title,summary,ideas_json,source_urls_json,status,created_at)
                    VALUES (?,?,?,?,?,?,?)
                    """,
                    (
                        data.get("topic_id"),
                        data.get("title", "Untitled Brief"),
                        data.get("summary", ""),
                        json.dumps(data.get("ideas_json", []), ensure_ascii=False),
                        json.dumps(data.get("source_urls_json", []), ensure_ascii=False),
                        data.get("status", "draft"),
                        now_iso(),
                    ),
                )
                conn.commit()
                row = conn.execute("SELECT * FROM research_briefs WHERE id=?", (cur.lastrowid,)).fetchone()
                return json_response(self, row_dict(row), 201)

            if path.startswith("/api/research/briefs/") and path.endswith("/clip_to_note"):
                brief_id = int(path.split("/")[4])
                brief = conn.execute("SELECT * FROM research_briefs WHERE id=?", (brief_id,)).fetchone()
                if not brief:
                    return json_response(self, {"error": "brief not found"}, 404)
                cur = conn.execute(
                    "INSERT INTO notes(title,body,is_moc,topic_id,created_at,updated_at) VALUES (?,?,?,?,?,?)",
                    (
                        f"Clip - {brief['title']}",
                        f"{brief['summary']}\n\nIdeas: {brief['ideas_json']}\nSources: {brief['source_urls_json']}",
                        0,
                        brief["topic_id"],
                        now_iso(),
                        now_iso(),
                    ),
                )
                conn.commit()
                return json_response(self, {"note_id": cur.lastrowid}, 201)

            if path.startswith("/api/research/briefs/") and path.endswith("/attach_scene"):
                brief_id = int(path.split("/")[4])
                scene_id = int(data["scene_id"])
                conn.execute(
                    "INSERT OR IGNORE INTO scene_briefs(scene_id,brief_id) VALUES (?,?)",
                    (scene_id, brief_id),
                )
                conn.commit()
                return json_response(self, {"ok": True})

            return json_response(self, {"error": "not found"}, 404)
        finally:
            conn.close()

    def do_PUT(self):
        path = urlparse(self.path).path
        data = read_json(self)
        conn = get_conn()
        try:
            if path.startswith("/api/scenes/"):
                sid = int(path.split("/")[-1])
                conn.execute(
                    "UPDATE scenes SET title=?, slugline=?, body=? WHERE id=?",
                    (data.get("title"), data.get("slugline"), data.get("body"), sid),
                )
                conn.commit()
                row = conn.execute("SELECT * FROM scenes WHERE id=?", (sid,)).fetchone()
                return json_response(self, row_dict(row))

            if path.startswith("/api/notes/"):
                nid = int(path.split("/")[-1])
                conn.execute(
                    "UPDATE notes SET title=?, body=?, is_moc=?, updated_at=? WHERE id=?",
                    (data.get("title"), data.get("body"), int(bool(data.get("is_moc"))), now_iso(), nid),
                )
                conn.commit()
                row = conn.execute("SELECT * FROM notes WHERE id=?", (nid,)).fetchone()
                return json_response(self, row_dict(row))

            if path.startswith("/api/research/topics/"):
                tid = int(path.split("/")[-1])
                conn.execute("UPDATE research_topics SET name=?, description=? WHERE id=?", (data.get("name"), data.get("description"), tid))
                conn.commit()
                row = conn.execute("SELECT * FROM research_topics WHERE id=?", (tid,)).fetchone()
                return json_response(self, row_dict(row))

            if path.startswith("/api/research/briefs/"):
                bid = int(path.split("/")[-1])
                conn.execute(
                    "UPDATE research_briefs SET title=?,summary=?,ideas_json=?,source_urls_json=?,status=? WHERE id=?",
                    (
                        data.get("title"),
                        data.get("summary"),
                        json.dumps(data.get("ideas_json", []), ensure_ascii=False),
                        json.dumps(data.get("source_urls_json", []), ensure_ascii=False),
                        data.get("status", "draft"),
                        bid,
                    ),
                )
                conn.commit()
                row = conn.execute("SELECT * FROM research_briefs WHERE id=?", (bid,)).fetchone()
                return json_response(self, row_dict(row))

            return json_response(self, {"error": "not found"}, 404)
        finally:
            conn.close()

    def do_DELETE(self):
        path = urlparse(self.path).path
        conn = get_conn()
        try:
            if path.startswith("/api/scenes/"):
                sid = int(path.split("/")[-1])
                conn.execute("UPDATE scenes SET deleted_at=? WHERE id=?", (now_iso(), sid))
                conn.commit()
                return json_response(self, {"ok": True})
            if path.startswith("/api/notes/"):
                nid = int(path.split("/")[-1])
                conn.execute("DELETE FROM notes WHERE id=?", (nid,))
                conn.commit()
                return json_response(self, {"ok": True})
            if path.startswith("/api/research/topics/"):
                tid = int(path.split("/")[-1])
                conn.execute("DELETE FROM research_topics WHERE id=?", (tid,))
                conn.commit()
                return json_response(self, {"ok": True})
            return json_response(self, {"error": "not found"}, 404)
        finally:
            conn.close()


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "8000"))), ApiHandler)
    print("Server on http://0.0.0.0:8000")
    server.serve_forever()
