import Database from '@tauri-apps/plugin-sql';
import type {
  Note,
  OutputDoc,
  OutputSource,
  Project,
  ResearchBrief,
  ResearchTopic,
  Scene,
} from './types';

let dbPromise: Promise<Database> | null = null;

async function db() {
  if (!dbPromise) dbPromise = Database.load('sqlite:writingtools.db');
  return dbPromise;
}

// ── 스키마 초기화 ──────────────────────────────────────────
export async function initDb() {
  const conn = await db();
  await conn.execute(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS scenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    order_key TEXT NOT NULL,
    slugline TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body_md TEXT NOT NULL DEFAULT '',
    is_moc INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS outputs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    moc_note_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    body_md TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (moc_note_id) REFERENCES notes(id)
  )`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS output_sources (
    output_id INTEGER NOT NULL,
    section_key TEXT NOT NULL,
    source_note_id INTEGER NOT NULL,
    FOREIGN KEY (output_id) REFERENCES outputs(id),
    FOREIGN KEY (source_note_id) REFERENCES notes(id)
  )`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS research_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    query_md TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS research_briefs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    ideas_json TEXT NOT NULL,
    source_urls_json TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'new',
    FOREIGN KEY (topic_id) REFERENCES research_topics(id)
  )`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS scene_briefs (
    scene_id INTEGER NOT NULL,
    brief_id INTEGER NOT NULL,
    PRIMARY KEY (scene_id, brief_id),
    FOREIGN KEY (scene_id) REFERENCES scenes(id),
    FOREIGN KEY (brief_id) REFERENCES research_briefs(id)
  )`);
}

// ── Projects ───────────────────────────────────────────────
export async function listProjects(): Promise<Project[]> {
  return (await db()).select<Project[]>(
    'SELECT * FROM projects ORDER BY updated_at DESC',
  );
}

export async function createScreenplayProject(
  title: string,
): Promise<Project> {
  const conn = await db();
  const result = await conn.execute(
    'INSERT INTO projects (type, title) VALUES ($1, $2)',
    ['screenplay', title],
  );
  const rows = await conn.select<Project[]>(
    'SELECT * FROM projects WHERE id = $1',
    [result.lastInsertId],
  );
  return rows[0];
}

// ── Scenes ─────────────────────────────────────────────────
export async function listScenes(projectId: number): Promise<Scene[]> {
  return (await db()).select<Scene[]>(
    'SELECT * FROM scenes WHERE project_id = $1 ORDER BY CAST(order_key AS INTEGER) ASC',
    [projectId],
  );
}

export async function createScene(
  projectId: number,
  orderKey: string,
): Promise<Scene> {
  const conn = await db();
  const result = await conn.execute(
    'INSERT INTO scenes (project_id, order_key, slugline, body) VALUES ($1,$2,$3,$4)',
    [projectId, orderKey, 'INT. NEW LOCATION - DAY', ''],
  );
  const rows = await conn.select<Scene[]>(
    'SELECT * FROM scenes WHERE id = $1',
    [result.lastInsertId],
  );
  return rows[0];
}

export async function saveScene(scene: Scene): Promise<void> {
  await (
    await db()
  ).execute(
    'UPDATE scenes SET order_key=$1, slugline=$2, body=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4',
    [scene.order_key, scene.slugline, scene.body, scene.id],
  );
}

export async function deleteScene(sceneId: number): Promise<void> {
  const conn = await db();
  await conn.execute('DELETE FROM scene_briefs WHERE scene_id=$1', [sceneId]);
  await conn.execute('DELETE FROM scenes WHERE id=$1', [sceneId]);
}

// ── Notes ──────────────────────────────────────────────────
export async function listNotes(): Promise<Note[]> {
  return (await db()).select<Note[]>(
    'SELECT * FROM notes ORDER BY updated_at DESC',
  );
}

export async function createNote(
  title: string,
  isMoc = false,
): Promise<Note> {
  const conn = await db();
  const result = await conn.execute(
    'INSERT INTO notes (title, is_moc) VALUES ($1, $2)',
    [title, isMoc ? 1 : 0],
  );
  const rows = await conn.select<Note[]>(
    'SELECT * FROM notes WHERE id = $1',
    [result.lastInsertId],
  );
  return rows[0];
}

export async function saveNote(note: Note): Promise<void> {
  await (
    await db()
  ).execute(
    'UPDATE notes SET title=$1, body_md=$2, is_moc=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4',
    [note.title, note.body_md, note.is_moc, note.id],
  );
}

export async function deleteNote(id: number): Promise<void> {
  const conn = await db();
  await conn.execute('DELETE FROM output_sources WHERE source_note_id=$1', [
    id,
  ]);
  await conn.execute('DELETE FROM notes WHERE id=$1', [id]);
}

// ── Outputs ────────────────────────────────────────────────
export async function listOutputs(): Promise<OutputDoc[]> {
  return (await db()).select<OutputDoc[]>(
    'SELECT * FROM outputs ORDER BY id DESC',
  );
}

export async function getOutput(id: number): Promise<OutputDoc | undefined> {
  const rows = await (
    await db()
  ).select<OutputDoc[]>('SELECT * FROM outputs WHERE id=$1', [id]);
  return rows[0];
}

export async function createOutput(
  mocNoteId: number,
  title: string,
  bodyMd: string,
): Promise<OutputDoc> {
  const conn = await db();
  const result = await conn.execute(
    'INSERT INTO outputs (moc_note_id, title, body_md) VALUES ($1,$2,$3)',
    [mocNoteId, title, bodyMd],
  );
  const rows = await conn.select<OutputDoc[]>(
    'SELECT * FROM outputs WHERE id = $1',
    [result.lastInsertId],
  );
  return rows[0];
}

export async function saveOutput(output: OutputDoc): Promise<void> {
  await (
    await db()
  ).execute('UPDATE outputs SET title=$1, body_md=$2 WHERE id=$3', [
    output.title,
    output.body_md,
    output.id,
  ]);
}

export async function addOutputSource(
  outputId: number,
  sectionKey: string,
  noteId: number,
): Promise<void> {
  await (
    await db()
  ).execute(
    'INSERT INTO output_sources (output_id, section_key, source_note_id) VALUES ($1,$2,$3)',
    [outputId, sectionKey, noteId],
  );
}

export async function getOutputSources(
  outputId: number,
): Promise<OutputSource[]> {
  return (await db()).select<OutputSource[]>(
    'SELECT os.output_id, os.section_key, os.source_note_id, n.title FROM output_sources os JOIN notes n ON n.id = os.source_note_id WHERE os.output_id=$1',
    [outputId],
  );
}

// ── Research Topics ────────────────────────────────────────
export async function listTopics(): Promise<ResearchTopic[]> {
  return (await db()).select<ResearchTopic[]>(
    'SELECT * FROM research_topics ORDER BY id DESC',
  );
}

export async function createTopic(
  projectId: number,
  title: string,
): Promise<ResearchTopic> {
  const conn = await db();
  const result = await conn.execute(
    'INSERT INTO research_topics (project_id, title, query_md) VALUES ($1,$2,$3)',
    [projectId, title, ''],
  );
  const rows = await conn.select<ResearchTopic[]>(
    'SELECT * FROM research_topics WHERE id = $1',
    [result.lastInsertId],
  );
  return rows[0];
}

export async function saveTopic(topic: ResearchTopic): Promise<void> {
  await (
    await db()
  ).execute(
    'UPDATE research_topics SET title=$1, query_md=$2 WHERE id=$3',
    [topic.title, topic.query_md, topic.id],
  );
}

// ── Research Briefs ────────────────────────────────────────
export async function listBriefs(topicId: number): Promise<ResearchBrief[]> {
  return (await db()).select<ResearchBrief[]>(
    'SELECT * FROM research_briefs WHERE topic_id=$1 ORDER BY id DESC',
    [topicId],
  );
}

export async function createBrief(
  topicId: number,
  payload: {
    title: string;
    summary: string;
    ideas_json: string;
    source_urls_json: string;
    status: string;
  },
): Promise<ResearchBrief> {
  const conn = await db();
  const result = await conn.execute(
    'INSERT INTO research_briefs (topic_id,title,summary,ideas_json,source_urls_json,status) VALUES ($1,$2,$3,$4,$5,$6)',
    [
      topicId,
      payload.title,
      payload.summary,
      payload.ideas_json,
      payload.source_urls_json,
      payload.status,
    ],
  );
  const rows = await conn.select<ResearchBrief[]>(
    'SELECT * FROM research_briefs WHERE id = $1',
    [result.lastInsertId],
  );
  return rows[0];
}

export async function attachBriefToScene(
  sceneId: number,
  briefId: number,
): Promise<void> {
  await (
    await db()
  ).execute('INSERT OR IGNORE INTO scene_briefs (scene_id, brief_id) VALUES ($1,$2)', [
    sceneId,
    briefId,
  ]);
}

export async function briefsForScene(sceneId: number): Promise<ResearchBrief[]> {
  return (await db()).select<ResearchBrief[]>(
    'SELECT rb.* FROM scene_briefs sb JOIN research_briefs rb ON rb.id = sb.brief_id WHERE sb.scene_id=$1',
    [sceneId],
  );
}

export async function listProjectTopics(
  projectId: number,
): Promise<ResearchTopic[]> {
  return (await db()).select<ResearchTopic[]>(
    'SELECT * FROM research_topics WHERE project_id=$1 ORDER BY id DESC',
    [projectId],
  );
}
