import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { useOutputStore } from '@/stores/useOutputStore';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { EmptyState } from '@/components/EmptyState';
import {
  createScreenplayProject,
  createScene,
  saveScene,
  listScenes,
} from '@/lib/db';
import type { OutputDoc } from '@/lib/types';

export function OutputPage() {
  const outputId = Number(useParams().id);
  const nav = useNavigate();
  const {
    currentOutput,
    sources,
    loading,
    fetchOutput,
    updateOutput,
    persistOutput,
  } = useOutputStore();

  const debouncedSave = useDebouncedSave(persistOutput);

  useEffect(() => {
    void fetchOutput(outputId);
  }, [outputId, fetchOutput]);

  const mdExtensions = useMemo(() => [markdown()], []);

  const handleTitleChange = useCallback(
    (value: string) => {
      if (!currentOutput) return;
      const updated: OutputDoc = { ...currentOutput, title: value };
      updateOutput(updated);
      debouncedSave(updated);
    },
    [currentOutput, updateOutput, debouncedSave],
  );

  const handleBodyChange = useCallback(
    (value: string) => {
      if (!currentOutput) return;
      const updated: OutputDoc = { ...currentOutput, body_md: value };
      updateOutput(updated);
      debouncedSave(updated);
    },
    [currentOutput, updateOutput, debouncedSave],
  );

  // Output → Screenplay 프로젝트 생성
  const handleMakeProject = async () => {
    if (!currentOutput) return;

    const project = await createScreenplayProject(
      `${currentOutput.title} Draft`,
    );

    // Plot Outline 섹션의 불릿 라인을 씬 slugline으로 사용
    const lines = currentOutput.body_md
      .split('\n')
      .filter((l) => l.trim().startsWith('-'))
      .map((l) => l.replace(/^[\s-]+/, '').trim())
      .filter(Boolean);

    const sceneCount = Math.max(8, Math.min(12, lines.length || 8));

    for (let i = 0; i < sceneCount; i++) {
      await createScene(project.id, String((i + 1) * 10000));
    }

    const scenes = await listScenes(project.id);
    for (let i = 0; i < scenes.length; i++) {
      const slugline = lines[i]
        ? `${lines[i].toUpperCase()}`
        : `SCENE ${i + 1} - (TBD)`;
      await saveScene({ ...scenes[i], slugline });
    }

    nav(`/projects/${project.id}`);
  };

  if (loading) return <div className="padded">Loading...</div>;
  if (!currentOutput) return <div className="padded"><EmptyState message="Output not found" /></div>;

  return (
    <div className="padded">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input
          className="input input-lg"
          style={{ flex: 1 }}
          value={currentOutput.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Output title"
        />
        <button
          className="btn btn-primary"
          onClick={() => void handleMakeProject()}
        >
          Create Screenplay Project
        </button>
      </div>

      {/* 출처 노트 칩 */}
      <div className="section-label">Source Notes</div>
      <div className="synopsis-chips">
        {sources.length === 0 && (
          <span style={{ fontSize: 13, color: '#999' }}>No linked sources</span>
        )}
        {sources.map((s) => (
          <span
            key={`${s.section_key}-${s.source_note_id}`}
            className="chip"
          >
            {s.section_key}: {s.title}
          </span>
        ))}
      </div>

      {/* Synopsis 에디터 */}
      <div style={{ marginTop: 12 }}>
        <CodeMirror
          value={currentOutput.body_md}
          height="calc(100vh - 260px)"
          extensions={mdExtensions}
          onChange={handleBodyChange}
        />
      </div>
    </div>
  );
}
