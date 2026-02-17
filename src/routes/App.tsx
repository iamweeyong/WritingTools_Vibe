import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import {
  addOutputSource,
  attachBriefToScene,
  briefsForScene,
  createBrief,
  createNote,
  createOutput,
  createScene,
  createScreenplayProject,
  createTopic,
  deleteNote,
  deleteScene,
  getOutput,
  getOutputSources,
  initDb,
  listBriefs,
  listNotes,
  listOutputs,
  listProjects,
  listScenes,
  listTopics,
  saveNote,
  saveOutput,
  saveScene,
} from '../lib/db';
import { extractWikiLinks, sceneCompile } from '../lib/parsers';
import { reindexScenes } from '../lib/orderKey';
import type { Note, OutputDoc, Project, ResearchBrief, ResearchTopic, Scene } from '../lib/types';

const synopsisTemplate = `# Synopsis Board\n\n## Premise\n\n## Theme\n\n## Protagonist (Desire/Flaw)\n\n## Antagonist / Stakes\n\n## Plot Outline (Act1/Act2/Act3)\n- Act1:\n- Act2:\n- Act3:\n\n## Ending Direction\n`;

export function App() {
  useEffect(() => { void initDb(); }, []);
  return (
    <div>
      <nav className="topnav">
        <Link to="/">Home</Link><Link to="/projects">Projects</Link><Link to="/notes">Notes</Link><Link to="/research">Research</Link>
      </nav>
      <Routes>
        <Route path="/" element={<div className="padded">WritingTools Vibe MVP</div>} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ScriptStudioPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/notes/:id" element={<NotesPage />} />
        <Route path="/outputs/:id" element={<OutputPage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const nav = useNavigate();
  const refresh = () => void listProjects().then(setProjects);
  useEffect(refresh, []);
  return <div className="padded"><h2>Projects</h2><button onClick={async () => { await createScreenplayProject(`Screenplay ${new Date().toLocaleString()}`); refresh(); }}>+ Screenplay</button>
    <ul>{projects.map(p => <li key={p.id}><Link to={`/projects/${p.id}`}>{p.title}</Link></li>)}</ul>
    <button onClick={() => projects[0] && nav(`/projects/${projects[0].id}`)}>Open latest</button>
  </div>;
}

function ScriptStudioPage() {
  const id = Number(useParams().id);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [briefs, setBriefs] = useState<ResearchBrief[]>([]);
  const active = scenes.find(s => s.id === selected) ?? scenes[0];

  const refresh = () => void listScenes(id).then((s) => { setScenes(s); if (!selected && s[0]) setSelected(s[0].id); });
  useEffect(refresh, [id]);
  useEffect(() => { if (active) void briefsForScene(active.id).then(setBriefs); }, [active?.id]);

  const moveScene = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir; if (target < 0 || target >= scenes.length) return;
    const copy = [...scenes]; [copy[idx], copy[target]] = [copy[target], copy[idx]];
    const re = reindexScenes(copy);
    setScenes(re); for (const s of re) await saveScene(s);
  };

  const insertSnippet = (snippet: string) => {
    if (!active) return;
    const updated = { ...active, body: `${active.body}\n${snippet}`.trim() };
    setScenes(scenes.map(s => s.id === updated.id ? updated : s));
    void saveScene(updated);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const map: Record<string, string> = { '1': 'Action: ', '2': '\nCHARACTER\n', '3': '\nDialogue line\n', '4': '(beat)', '5': 'CUT TO:' };
      if (map[e.key]) { e.preventDefault(); insertSnippet(map[e.key]); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [active, scenes]);

  const exportProject = async (ext: 'fountain' | 'txt') => {
    const body = scenes.map((s) => sceneCompile(s.slugline, s.body)).join('\n\n');
    const path = await save({ filters: [{ name: ext, extensions: [ext] }] });
    if (path) await writeTextFile(path, body);
  };

  return <div className="studio">
    <aside><button onClick={async () => { await createScene(id, String.fromCharCode(97 + scenes.length)); refresh(); }}>+ Scene</button>
      {scenes.map((s, i) => <div className={active?.id === s.id ? 'item active' : 'item'} key={s.id} onClick={() => setSelected(s.id)}>
        <div>{s.slugline}</div>
        <button onClick={(e)=>{e.stopPropagation(); void moveScene(i,-1);}}>↑</button><button onClick={(e)=>{e.stopPropagation(); void moveScene(i,1);}}>↓</button>
        <button onClick={async (e)=>{e.stopPropagation(); if(confirm('Delete scene?')){ await deleteScene(s.id); refresh(); }}}>삭제</button>
      </div>)}
      <button onClick={() => void exportProject('fountain')}>Export .fountain</button>
      <button onClick={() => void exportProject('txt')}>Export .txt</button>
    </aside>
    <main>{active && <>
      <input value={active.slugline} onChange={(e)=>{ const u={...active, slugline:e.target.value}; setScenes(scenes.map(s=>s.id===u.id?u:s)); void saveScene(u);} } />
      <div className="toolbar"><button onClick={()=>insertSnippet('Action: ')}>Action</button><button onClick={()=>insertSnippet('\nCHARACTER\n')}>Character</button><button onClick={()=>insertSnippet('\nDialogue line\n')}>Dialogue</button><button onClick={()=>insertSnippet('(beat)')}>Parenthetical</button><button onClick={()=>insertSnippet('CUT TO:')}>Transition</button></div>
      <CodeMirror value={active.body} height="70vh" onChange={(v)=>{ const u={...active, body:v}; setScenes(scenes.map(s=>s.id===u.id?u:s)); void saveScene(u); }} />
    </>}</main>
    <aside><h4>Attached Briefs</h4>{briefs.map((b)=><div key={b.id}><strong>{b.title}</strong><p>{b.summary}</p></div>)}</aside>
  </div>;
}

function NotesPage() {
  const id = Number(useParams().id);
  const [notes, setNotes] = useState<Note[]>([]);
  const [outputs, setOutputs] = useState<OutputDoc[]>([]);
  const nav = useNavigate();
  const active = notes.find(n => n.id === id) ?? notes[0];
  const backlinks = useMemo(() => {
    if (!active) return [] as Note[];
    return notes.filter((n) => n.id !== active.id && extractWikiLinks(n.body_md).includes(active.title));
  }, [notes, active]);
  const refresh = () => { void listNotes().then(setNotes); void listOutputs().then(setOutputs); };
  useEffect(refresh, [id]);

  const createOutputFromMoc = async () => {
    if (!active) return;
    const linkedTitles = extractWikiLinks(active.body_md);
    const linked = notes.filter((n) => linkedTitles.includes(n.title));
    const out = await createOutput(active.id, `${active.title} Synopsis`, synopsisTemplate);
    for (const note of linked) await addOutputSource(out.id, 'all', note.id);
    nav(`/outputs/${out.id}`);
  };

  return <div className="studio"><aside><button onClick={async ()=>{ await createNote(`Note ${Date.now()}`); refresh(); }}>+ Note</button><button onClick={async ()=>{ await createNote(`MOC ${Date.now()}`, true); refresh(); }}>+ MOC</button>
    {notes.map(n=><div key={n.id}><Link to={`/notes/${n.id}`}>{n.title}{n.is_moc ? ' (MOC)' : ''}</Link></div>)}</aside>
    <main>{active && <>
      <input value={active.title} onChange={(e)=>{ const u={...active, title:e.target.value}; setNotes(notes.map(n=>n.id===u.id?u:n)); void saveNote(u);} } />
      <CodeMirror value={active.body_md} extensions={[markdown()]} height="70vh" onChange={(v)=>{ const u={...active, body_md:v}; setNotes(notes.map(n=>n.id===u.id?u:n)); void saveNote(u);} } />
      <button onClick={async ()=>{ if(confirm('Delete note?')) { await deleteNote(active.id); nav('/notes'); refresh(); }}}>Delete</button>
    </>}</main>
    <aside><h4>Backlinks</h4>{backlinks.map((b)=><div key={b.id}>{b.title}</div>)}
      {active?.is_moc === 1 && <button onClick={() => void createOutputFromMoc()}>이 MOC로 Output 만들기</button>}
      <h4>Outputs</h4>{outputs.map(o=><Link key={o.id} to={`/outputs/${o.id}`}>{o.title}</Link>)}
    </aside></div>;
}

function OutputPage() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const [out, setOut] = useState<OutputDoc | null>(null);
  const [sources, setSources] = useState<{section_key:string;source_note_id:number;title:string}[]>([]);

  const refresh = () => { void getOutput(id).then(setOut); void getOutputSources(id).then(setSources); };
  useEffect(refresh, [id]);

  const makeProject = async () => {
    if (!out) return;
    await createScreenplayProject(`${out.title} Draft`);
    const projects = await listProjects();
    const p = projects[0];
    const lines = out.body_md.split('\n').filter((l) => l.trim().startsWith('-'));
    const count = Math.min(12, Math.max(8, lines.length || 8));
    for (let i = 0; i < count; i += 1) await createScene(p.id, String.fromCharCode(97 + i));
    const scenes = await listScenes(p.id);
    for (let i = 0; i < scenes.length; i += 1) await saveScene({ ...scenes[i], slugline: `SCENE ${i + 1} - (수정 필요)` });
    nav(`/projects/${p.id}`);
  };

  return <div className="padded">{out && <>
    <input value={out.title} onChange={(e)=> setOut({...out, title:e.target.value})} />
    <button onClick={()=> void saveOutput(out)}>Save Output</button>
    <button onClick={()=> void makeProject()}>Screenplay 프로젝트로 만들기</button>
    <CodeMirror value={out.body_md} extensions={[markdown()]} height="65vh" onChange={(v)=> setOut({...out, body_md:v})} />
    <h4>출처 노트 칩</h4><div>{sources.map((s)=><span key={`${s.section_key}-${s.source_note_id}`} className="chip">{s.section_key}: {s.title}</span>)}</div>
  </>}</div>;
}

function ResearchPage() {
  const [topics, setTopics] = useState<ResearchTopic[]>([]);
  const [briefs, setBriefs] = useState<ResearchBrief[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const refresh = async () => {
    const ts = await listTopics(); setTopics(ts);
    if (ts[0]) {
      setSelectedTopic(ts[0].id);
      setBriefs(await listBriefs(ts[0].id));
      const projects = await listProjects();
      if (projects[0]) setScenes(await listScenes(projects[0].id));
    }
  };
  useEffect(() => { void refresh(); }, []);

  return <div className="studio"><aside><button onClick={async ()=>{ const ps = await listProjects(); await createTopic(ps[0]?.id ?? 1, `Topic ${Date.now()}`); refresh(); }}>+ Topic</button>
    {topics.map(t=> <div key={t.id} onClick={async ()=>{ setSelectedTopic(t.id); setBriefs(await listBriefs(t.id)); }}>{t.title}</div>)}</aside>
    <main>
      <button onClick={async ()=>{ if(!selectedTopic) return; await createBrief(selectedTopic, { title: 'Manual Brief', summary: '요약', ideas_json: JSON.stringify(['아이디어1','아이디어2']), source_urls_json: JSON.stringify(['https://example.com']), status: 'new' }); refresh(); }}>+ 브리핑 카드</button>
      {briefs.map(b=><div className="card" key={b.id}><h4>{b.title}</h4><p>{b.summary}</p><button onClick={async ()=>{ await createNote(`[CLIP] ${b.title}`); const notes = await listNotes(); const n=notes[0]; await saveNote({ ...n, body_md: `# 출처\n${JSON.parse(b.source_urls_json)[0]}\n\n# 요약\n${b.summary}` }); alert('노트로 저장됨'); }}>클리핑으로 저장</button>
      <button onClick={async ()=>{ if(!scenes[0]) return; await attachBriefToScene(scenes[0].id, b.id); alert('첫 씬에 연결됨'); }}>이 씬에 붙이기</button></div>)}
    </main>
    <aside>Iteration 1 Research Stub</aside>
  </div>;
}
