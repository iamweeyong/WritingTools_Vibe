import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { keymap, EditorView } from '@codemirror/view';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useSceneStore } from '@/stores/useSceneStore';
import { useUIStore } from '@/stores/useUIStore';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { EmptyState } from '@/components/EmptyState';
import { SCREENPLAY_SNIPPETS } from '@/lib/constants';
import { sceneCompile } from '@/lib/parsers';
import { briefsForScene } from '@/lib/db';
import type { Scene } from '@/lib/types';
import type { ResearchBrief } from '@/lib/types';
import { useState } from 'react';

export function ScriptStudioPage() {
  const projectId = Number(useParams().id);
  const {
    scenes,
    activeSceneId,
    loading,
    setActiveScene,
    fetchScenes,
    addScene,
    updateScene,
    persistScene,
    removeScene,
    moveScene,
  } = useSceneStore();
  const showConfirm = useUIStore((s) => s.showConfirm);
  const [briefs, setBriefs] = useState<ResearchBrief[]>([]);

  const viewRef = useRef<EditorView | null>(null);
  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null;

  const debouncedSave = useDebouncedSave(persistScene);

  // 씬 목록 로드
  useEffect(() => {
    useSceneStore.setState({ activeSceneId: null });
    void fetchScenes(projectId);
  }, [projectId, fetchScenes]);

  // 활성 씬 변경 시 브리프 로드
  useEffect(() => {
    if (activeSceneId) {
      void briefsForScene(activeSceneId).then(setBriefs);
    } else {
      setBriefs([]);
    }
  }, [activeSceneId]);

  // 커서 위치에 스니펫 삽입
  const insertSnippet = useCallback(
    (text: string) => {
      const view = viewRef.current;
      if (!view || !activeScene) return;
      view.dispatch(view.state.replaceSelection(text));
      view.focus();
    },
    [activeScene],
  );

  // CodeMirror keymap 확장
  const snippetKeymap = useMemo(
    () =>
      keymap.of(
        Object.values(SCREENPLAY_SNIPPETS).map(({ text, shortcut }) => ({
          key: shortcut,
          run: (view: EditorView) => {
            view.dispatch(view.state.replaceSelection(text));
            return true;
          },
        })),
      ),
    [],
  );

  const extensions = useMemo(() => [snippetKeymap], [snippetKeymap]);

  // 본문 변경
  const handleBodyChange = useCallback(
    (value: string) => {
      if (!activeScene) return;
      const updated: Scene = { ...activeScene, body: value };
      updateScene(updated);
      debouncedSave(updated);
    },
    [activeScene, updateScene, debouncedSave],
  );

  // 슬러그라인 변경
  const handleSluglineChange = useCallback(
    (value: string) => {
      if (!activeScene) return;
      const updated: Scene = { ...activeScene, slugline: value };
      updateScene(updated);
      debouncedSave(updated);
    },
    [activeScene, updateScene, debouncedSave],
  );

  // Export
  const exportProject = async (ext: 'fountain' | 'txt') => {
    const body = scenes
      .map((s) => sceneCompile(s.slugline, s.body))
      .join('\n\n\n');
    const path = await save({
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
    if (path) await writeTextFile(path, body);
  };

  return (
    <div className="studio">
      {/* ── Left: Scene List ── */}
      <div className="panel">
        <div className="sidebar-header">
          <h3>Scenes</h3>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => void addScene(projectId)}
          >
            + Scene
          </button>
        </div>

        {loading && <p style={{ padding: '10px', color: '#999' }}>Loading...</p>}

        {!loading && scenes.length === 0 && (
          <EmptyState message="No scenes yet" />
        )}

        {scenes.map((s, i) => (
          <div
            key={s.id}
            className={`sidebar-item ${activeSceneId === s.id ? 'active' : ''}`}
            onClick={() => setActiveScene(s.id)}
          >
            <span className="item-title">
              {s.slugline || '(untitled)'}
            </span>
            <span className="item-actions">
              <button
                className="btn btn-icon btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  void moveScene(i, -1, projectId);
                }}
                title="Move up"
              >
                ↑
              </button>
              <button
                className="btn btn-icon btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  void moveScene(i, 1, projectId);
                }}
                title="Move down"
              >
                ↓
              </button>
              <button
                className="btn btn-icon btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  showConfirm('Delete this scene?', () => {
                    void removeScene(s.id, projectId);
                  });
                }}
                title="Delete"
              >
                ×
              </button>
            </span>
          </div>
        ))}

        <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12 }}>
          <button
            className="btn btn-sm"
            style={{ width: '100%', marginBottom: 4 }}
            onClick={() => void exportProject('fountain')}
          >
            Export .fountain
          </button>
          <button
            className="btn btn-sm"
            style={{ width: '100%' }}
            onClick={() => void exportProject('txt')}
          >
            Export .txt
          </button>
        </div>
      </div>

      {/* ── Center: Editor ── */}
      <div className="panel-main">
        {activeScene ? (
          <>
            <input
              className="input input-lg"
              value={activeScene.slugline}
              onChange={(e) => handleSluglineChange(e.target.value)}
              placeholder="INT. LOCATION - TIME"
            />

            <div className="toolbar">
              {Object.values(SCREENPLAY_SNIPPETS).map((snip) => (
                <button
                  key={snip.label}
                  className="btn"
                  onClick={() => insertSnippet(snip.text)}
                  title={snip.shortcut}
                >
                  {snip.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              <CodeMirror
                value={activeScene.body}
                height="100%"
                style={{ height: '100%' }}
                extensions={extensions}
                onChange={handleBodyChange}
                onCreateEditor={(view) => {
                  viewRef.current = view;
                }}
              />
            </div>
          </>
        ) : (
          <EmptyState message="Select or create a scene to start editing" />
        )}
      </div>

      {/* ── Right: Context Panel ── */}
      <div className="panel">
        <div className="section-label">Attached Briefs</div>
        {briefs.length === 0 && (
          <p style={{ fontSize: 13, color: '#999', padding: '0 10px' }}>
            No briefs attached to this scene
          </p>
        )}
        {briefs.map((b) => (
          <div className="card" key={b.id}>
            <h4>{b.title}</h4>
            <p>{b.summary}</p>
            {(() => {
              try {
                const ideas: string[] = JSON.parse(b.ideas_json);
                return ideas.length > 0 ? (
                  <ul className="ideas-list">
                    {ideas.map((idea, i) => (
                      <li key={i}>{idea}</li>
                    ))}
                  </ul>
                ) : null;
              } catch {
                return null;
              }
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
