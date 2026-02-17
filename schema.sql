CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'screenplay',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  slugline TEXT,
  body TEXT,
  position INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL UNIQUE,
  body TEXT,
  is_moc INTEGER NOT NULL DEFAULT 0,
  topic_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outputs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL,
  source_note_id INTEGER,
  project_id INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY(source_note_id) REFERENCES notes(id) ON DELETE SET NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS output_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  output_id INTEGER NOT NULL,
  section TEXT NOT NULL,
  note_id INTEGER NOT NULL,
  FOREIGN KEY(output_id) REFERENCES outputs(id) ON DELETE CASCADE,
  FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS research_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER,
  title TEXT NOT NULL,
  summary TEXT,
  ideas_json TEXT NOT NULL DEFAULT '[]',
  source_urls_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  FOREIGN KEY(topic_id) REFERENCES research_topics(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS scene_briefs (
  scene_id INTEGER NOT NULL,
  brief_id INTEGER NOT NULL,
  PRIMARY KEY(scene_id, brief_id),
  FOREIGN KEY(scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
  FOREIGN KEY(brief_id) REFERENCES research_briefs(id) ON DELETE CASCADE
);
