import Database from '@tauri-apps/plugin-sql';
import type { Note, OutputDoc, Project, ResearchBrief, ResearchTopic, Scene } from './types';

let dbPromise: Promise<Database> | null = null;

async function db() {
  if (!dbPromise) dbPromise = Database.load('sqlite:writingtools.db');
  return dbPromise;
}

export async function initDb() {
  const conn = await db();
  await conn.execute(`CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, title TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS scenes (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, order_key TEXT NOT NULL, slugline TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body_md TEXT NOT NULL DEFAULT '', is_moc INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS outputs (id INTEGER PRIMARY KEY AUTOINCREMENT, moc_note_id INTEGER NOT NULL, title TEXT NOT NULL, body_md TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS output_sources (output_id INTEGER NOT NULL, section_key TEXT NOT NULL, source_note_id INTEGER NOT NULL)`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS research_topics (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, title TEXT NOT NULL, query_md TEXT NOT NULL DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS research_briefs (id INTEGER PRIMARY KEY AUTOINCREMENT, topic_id INTEGER NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, ideas_json TEXT NOT NULL, source_urls_json TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, status TEXT NOT NULL DEFAULT 'new')`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS scene_briefs (scene_id INTEGER NOT NULL, brief_id INTEGER NOT NULL)`);
}

export async function listProjects() {
  return (await (await db()).select<Project[]>('SELECT * FROM projects ORDER BY updated_at DESC'));
}

export async function createScreenplayProject(title: string) {
  const conn = await db();
  await conn.execute('INSERT INTO projects (type, title) VALUES ($1, $2)', ['screenplay', title]);
}

export async function listScenes(projectId: number) {
  return (await (await db()).select<Scene[]>('SELECT * FROM scenes WHERE project_id = $1 ORDER BY order_key ASC', [projectId]));
}

export async function createScene(projectId: number, orderKey: string) {
  await (await db()).execute('INSERT INTO scenes (project_id, order_key, slugline, body) VALUES ($1,$2,$3,$4)', [projectId, orderKey, 'INT. NEW LOCATION - DAY', '']);
}

export async function saveScene(scene: Scene) {
  await (await db()).execute('UPDATE scenes SET order_key=$1, slugline=$2, body=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4', [scene.order_key, scene.slugline, scene.body, scene.id]);
}

export async function deleteScene(sceneId: number) {
  await (await db()).execute('DELETE FROM scenes WHERE id=$1', [sceneId]);
}

export async function listNotes() { return await (await db()).select<Note[]>('SELECT * FROM notes ORDER BY updated_at DESC'); }
export async function createNote(title: string, isMoc = false) { await (await db()).execute('INSERT INTO notes (title, is_moc) VALUES ($1, $2)', [title, isMoc ? 1 : 0]); }
export async function saveNote(note: Note) { await (await db()).execute('UPDATE notes SET title=$1, body_md=$2, is_moc=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4', [note.title, note.body_md, note.is_moc, note.id]); }
export async function deleteNote(id: number) { await (await db()).execute('DELETE FROM notes WHERE id=$1', [id]); }

export async function createOutput(mocNoteId: number, title: string, bodyMd: string) {
  const conn = await db();
  await conn.execute('INSERT INTO outputs (moc_note_id, title, body_md) VALUES ($1,$2,$3)', [mocNoteId, title, bodyMd]);
  const rows = await conn.select<OutputDoc[]>('SELECT * FROM outputs ORDER BY id DESC LIMIT 1');
  return rows[0];
}
export async function listOutputs() { return await (await db()).select<OutputDoc[]>('SELECT * FROM outputs ORDER BY id DESC'); }
export async function getOutput(id: number) { return (await (await db()).select<OutputDoc[]>('SELECT * FROM outputs WHERE id=$1', [id]))[0]; }
export async function saveOutput(output: OutputDoc) { await (await db()).execute('UPDATE outputs SET title=$1, body_md=$2 WHERE id=$3', [output.title, output.body_md, output.id]); }
export async function addOutputSource(outputId: number, sectionKey: string, noteId: number) { await (await db()).execute('INSERT INTO output_sources (output_id, section_key, source_note_id) VALUES ($1,$2,$3)', [outputId, sectionKey, noteId]); }
export async function getOutputSources(outputId: number) {
  return await (await db()).select<{section_key:string;source_note_id:number;title:string}[]>(
    'SELECT os.section_key, os.source_note_id, n.title FROM output_sources os JOIN notes n ON n.id = os.source_note_id WHERE output_id=$1', [outputId]);
}

export async function listTopics() { return await (await db()).select<ResearchTopic[]>('SELECT * FROM research_topics ORDER BY id DESC'); }
export async function createTopic(projectId: number, title: string) { await (await db()).execute('INSERT INTO research_topics (project_id, title, query_md) VALUES ($1,$2,$3)', [projectId, title, '']); }
export async function saveTopic(topic: ResearchTopic) { await (await db()).execute('UPDATE research_topics SET title=$1, query_md=$2 WHERE id=$3', [topic.title, topic.query_md, topic.id]); }

export async function listBriefs(topicId: number) { return await (await db()).select<ResearchBrief[]>('SELECT * FROM research_briefs WHERE topic_id=$1 ORDER BY id DESC', [topicId]); }
export async function createBrief(topicId: number, payload: Omit<ResearchBrief, 'id' | 'topic_id' | 'created_at'>) {
  await (await db()).execute('INSERT INTO research_briefs (topic_id,title,summary,ideas_json,source_urls_json,status) VALUES ($1,$2,$3,$4,$5,$6)', [topicId, payload.title, payload.summary, payload.ideas_json, payload.source_urls_json, payload.status]);
}
export async function attachBriefToScene(sceneId: number, briefId: number) { await (await db()).execute('INSERT INTO scene_briefs (scene_id, brief_id) VALUES ($1,$2)', [sceneId, briefId]); }
export async function briefsForScene(sceneId: number) {
  return await (await db()).select<ResearchBrief[]>('SELECT rb.* FROM scene_briefs sb JOIN research_briefs rb ON rb.id = sb.brief_id WHERE sb.scene_id=$1', [sceneId]);
}
