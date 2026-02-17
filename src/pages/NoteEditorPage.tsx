import { useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { useNoteStore } from '@/stores/useNoteStore';
import { useOutputStore } from '@/stores/useOutputStore';
import { useUIStore } from '@/stores/useUIStore';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { EmptyState } from '@/components/EmptyState';
import { SYNOPSIS_TEMPLATE } from '@/lib/constants';
import { extractWikiLinks, mapNotesToSections } from '@/lib/parsers';
import { createOutput, addOutputSource } from '@/lib/db';
import type { Note } from '@/lib/types';

export function NoteEditorPage() {
  const noteId = Number(useParams().id);
  const nav = useNavigate();
  const {
    notes,
    loading,
    fetchNotes,
    addNote,
    updateNote,
    persistNote,
    removeNote,
    getBacklinks,
  } = useNoteStore();
  const { outputs, fetchOutputs } = useOutputStore();
  const showConfirm = useUIStore((s) => s.showConfirm);

  const active = notes.find((n) => n.id === noteId) ?? null;
  const backlinks = active ? getBacklinks(active) : [];

  const debouncedSave = useDebouncedSave(persistNote);

  useEffect(() => {
    void fetchNotes();
    void fetchOutputs();
  }, [noteId, fetchNotes, fetchOutputs]);

  const mdExtensions = useMemo(() => [markdown()], []);

  const handleTitleChange = useCallback(
    (value: string) => {
      if (!active) return;
      const updated: Note = { ...active, title: value };
      updateNote(updated);
      debouncedSave(updated);
    },
    [active, updateNote, debouncedSave],
  );

  const handleBodyChange = useCallback(
    (value: string) => {
      if (!active) return;
      const updated: Note = { ...active, body_md: value };
      updateNote(updated);
      debouncedSave(updated);
    },
    [active, updateNote, debouncedSave],
  );

  const handleDelete = () => {
    if (!active) return;
    showConfirm('Delete this note?', () => {
      void removeNote(active.id).then(() => nav('/notes'));
    });
  };

  // MOC → Output 생성
  const handleCreateOutput = async () => {
    if (!active) return;
    const linkedTitles = extractWikiLinks(active.body_md);
    const linkedNotes = notes.filter((n) => linkedTitles.includes(n.title));
    const sectionMap = mapNotesToSections(active.body_md, linkedNotes);

    const out = await createOutput(
      active.id,
      `${active.title} Synopsis`,
      SYNOPSIS_TEMPLATE,
    );

    for (const [sectionKey, sectionNotes] of sectionMap.entries()) {
      for (const note of sectionNotes) {
        await addOutputSource(out.id, sectionKey, note.id);
      }
    }

    nav(`/outputs/${out.id}`);
  };

  const handleCreateNote = async (isMoc: boolean) => {
    const prefix = isMoc ? 'MOC' : 'Note';
    const note = await addNote(
      `${prefix} ${new Date().toLocaleString()}`,
      isMoc,
    );
    nav(`/notes/${note.id}`);
  };

  return (
    <div className="studio">
      {/* Left: Notes list */}
      <div className="panel">
        <div className="sidebar-header">
          <h3>Notes</h3>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => void handleCreateNote(false)}
            >
              + Note
            </button>
            <button
              className="btn btn-sm"
              onClick={() => void handleCreateNote(true)}
            >
              + MOC
            </button>
          </div>
        </div>

        {loading && <p style={{ padding: '10px', color: '#999' }}>Loading...</p>}

        {notes.map((n) => (
          <Link
            key={n.id}
            to={`/notes/${n.id}`}
            className={`sidebar-item ${n.id === noteId ? 'active' : ''}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <span className="item-title">
              {n.title}
              {n.is_moc !== 0 && (
                <span className="chip" style={{ marginLeft: 6 }}>
                  MOC
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>

      {/* Center: Editor */}
      <div className="panel-main">
        {active ? (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="input input-lg"
                style={{ flex: 1 }}
                value={active.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Note title"
              />
              <button className="btn btn-sm" onClick={handleDelete}>
                Delete
              </button>
            </div>

            <div style={{ flex: 1, minHeight: 0, marginTop: 8 }}>
              <CodeMirror
                value={active.body_md}
                height="100%"
                style={{ height: '100%' }}
                extensions={mdExtensions}
                onChange={handleBodyChange}
              />
            </div>
          </>
        ) : (
          <EmptyState message="Select a note to edit" />
        )}
      </div>

      {/* Right: Backlinks + MOC actions + Outputs */}
      <div className="panel">
        <div className="section-label">Backlinks</div>
        {backlinks.length === 0 && (
          <p style={{ fontSize: 13, color: '#999', padding: '0 10px' }}>
            No notes link here
          </p>
        )}
        {backlinks.map((b) => (
          <Link
            key={b.id}
            to={`/notes/${b.id}`}
            className="backlink-item"
          >
            {b.title}
          </Link>
        ))}

        {active && active.is_moc !== 0 && (
          <div style={{ padding: '12px 10px' }}>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => void handleCreateOutput()}
            >
              Create Output from MOC
            </button>
          </div>
        )}

        <div className="section-label" style={{ marginTop: 16 }}>
          Outputs
        </div>
        {outputs.length === 0 && (
          <p style={{ fontSize: 13, color: '#999', padding: '0 10px' }}>
            No outputs yet
          </p>
        )}
        {outputs.map((o) => (
          <Link
            key={o.id}
            to={`/outputs/${o.id}`}
            className="backlink-item"
          >
            {o.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
