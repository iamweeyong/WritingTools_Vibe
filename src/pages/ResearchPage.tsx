import { useEffect, useState } from 'react';
import { useResearchStore } from '@/stores/useResearchStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { SceneSelector } from '@/components/SceneSelector';
import { EmptyState } from '@/components/EmptyState';
import {
  attachBriefToScene,
  createNote,
  saveNote,
  listScenes,
  listNotes,
} from '@/lib/db';
import type { Scene } from '@/lib/types';

export function ResearchPage() {
  const {
    topics,
    selectedTopicId,
    briefs,
    loading,
    fetchTopics,
    selectTopic,
    addTopic,
    addBrief,
  } = useResearchStore();
  const { projects, fetchProjects } = useProjectStore();

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [showBriefForm, setShowBriefForm] = useState(false);
  const [briefForm, setBriefForm] = useState({
    title: '',
    summary: '',
    ideas: '',
    sourceUrl: '',
  });

  useEffect(() => {
    void fetchTopics();
    void fetchProjects();
  }, [fetchTopics, fetchProjects]);

  // 첫 프로젝트의 씬 목록을 로드 (브리프 연결용)
  useEffect(() => {
    if (projects.length > 0) {
      void listScenes(projects[0].id).then(setScenes);
    }
  }, [projects]);

  const handleAddTopic = async () => {
    if (projects.length === 0) return;
    await addTopic(
      projects[0].id,
      `Topic ${new Date().toLocaleString()}`,
    );
  };

  const handleSubmitBrief = async () => {
    if (!briefForm.title.trim()) return;
    const ideas = briefForm.ideas
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await addBrief({
      title: briefForm.title,
      summary: briefForm.summary,
      ideas_json: JSON.stringify(ideas),
      source_urls_json: JSON.stringify(
        briefForm.sourceUrl ? [briefForm.sourceUrl] : [],
      ),
    });
    setBriefForm({ title: '', summary: '', ideas: '', sourceUrl: '' });
    setShowBriefForm(false);
  };

  const handleClipToNote = async (brief: {
    title: string;
    summary: string;
    source_urls_json: string;
  }) => {
    const note = await createNote(`[CLIP] ${brief.title}`);
    let sourceUrl = '';
    try {
      const urls: string[] = JSON.parse(brief.source_urls_json);
      sourceUrl = urls[0] ?? '';
    } catch {
      /* ignore */
    }
    const allNotes = await listNotes();
    const created = allNotes.find((n) => n.id === note.id);
    if (created) {
      await saveNote({
        ...created,
        body_md: `# Source\n${sourceUrl}\n\n# Summary\n${brief.summary}`,
      });
    }
  };

  const handleAttachToScene = async (
    sceneId: number,
    briefId: number,
  ) => {
    await attachBriefToScene(sceneId, briefId);
  };

  return (
    <div className="studio">
      {/* Left: Topics */}
      <div className="panel">
        <div className="sidebar-header">
          <h3>Topics</h3>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => void handleAddTopic()}
            disabled={projects.length === 0}
          >
            + Topic
          </button>
        </div>

        {loading && <p style={{ padding: '10px', color: '#999' }}>Loading...</p>}

        {!loading && topics.length === 0 && (
          <EmptyState message="Create a project first, then add topics" />
        )}

        {topics.map((t) => (
          <div
            key={t.id}
            className={`sidebar-item ${selectedTopicId === t.id ? 'active' : ''}`}
            onClick={() => void selectTopic(t.id)}
          >
            <span className="item-title">{t.title}</span>
          </div>
        ))}
      </div>

      {/* Center: Briefs */}
      <div className="panel-main">
        {selectedTopicId ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Briefing Cards</h3>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowBriefForm(!showBriefForm)}
              >
                {showBriefForm ? 'Cancel' : '+ Briefing Card'}
              </button>
            </div>

            {showBriefForm && (
              <div className="card">
                <div className="brief-form">
                  <input
                    className="input"
                    placeholder="Title"
                    value={briefForm.title}
                    onChange={(e) =>
                      setBriefForm({ ...briefForm, title: e.target.value })
                    }
                  />
                  <input
                    className="input"
                    placeholder="Summary"
                    value={briefForm.summary}
                    onChange={(e) =>
                      setBriefForm({ ...briefForm, summary: e.target.value })
                    }
                  />
                  <input
                    className="input"
                    placeholder="Ideas (comma-separated)"
                    value={briefForm.ideas}
                    onChange={(e) =>
                      setBriefForm({ ...briefForm, ideas: e.target.value })
                    }
                  />
                  <input
                    className="input"
                    placeholder="Source URL"
                    value={briefForm.sourceUrl}
                    onChange={(e) =>
                      setBriefForm({ ...briefForm, sourceUrl: e.target.value })
                    }
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => void handleSubmitBrief()}
                  >
                    Save Brief
                  </button>
                </div>
              </div>
            )}

            {briefs.length === 0 && !showBriefForm && (
              <EmptyState message="No briefing cards yet for this topic" />
            )}

            {briefs.map((b) => {
              let ideas: string[] = [];
              let sourceUrls: string[] = [];
              try {
                ideas = JSON.parse(b.ideas_json);
              } catch {
                /* ignore */
              }
              try {
                sourceUrls = JSON.parse(b.source_urls_json);
              } catch {
                /* ignore */
              }

              return (
                <div className="card" key={b.id}>
                  <h4>{b.title}</h4>
                  <p>{b.summary}</p>

                  {ideas.length > 0 && (
                    <ul className="ideas-list">
                      {ideas.map((idea, i) => (
                        <li key={i}>{idea}</li>
                      ))}
                    </ul>
                  )}

                  {sourceUrls.length > 0 && (
                    <p style={{ fontSize: 12, color: '#666' }}>
                      Source: {sourceUrls[0]}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-sm"
                      onClick={() => void handleClipToNote(b)}
                    >
                      Clip to Note
                    </button>
                    <SceneSelector
                      scenes={scenes}
                      onSelect={(sceneId) =>
                        void handleAttachToScene(sceneId, b.id)
                      }
                    />
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <EmptyState message="Select a topic to view briefing cards" />
        )}
      </div>

      {/* Right: Info */}
      <div className="panel">
        <div className="section-label">Research Info</div>
        <p style={{ fontSize: 13, color: '#999', padding: '0 10px' }}>
          Research Inbox (Iteration 1 Stub). Add topics and briefing cards
          manually. Attach briefs to specific scenes for context.
        </p>
      </div>
    </div>
  );
}
