import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNoteStore } from '@/stores/useNoteStore';
import { useOutputStore } from '@/stores/useOutputStore';
import { EmptyState } from '@/components/EmptyState';

export function NotesPage() {
  const { notes, loading, fetchNotes, addNote } = useNoteStore();
  const { outputs, fetchOutputs } = useOutputStore();
  const nav = useNavigate();

  useEffect(() => {
    void fetchNotes();
    void fetchOutputs();
  }, [fetchNotes, fetchOutputs]);

  const handleCreateNote = async (isMoc: boolean) => {
    const prefix = isMoc ? 'MOC' : 'Note';
    const note = await addNote(`${prefix} ${new Date().toLocaleString()}`, isMoc);
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

        {!loading && notes.length === 0 && (
          <EmptyState message="No notes yet" />
        )}

        {notes.map((n) => (
          <Link
            key={n.id}
            to={`/notes/${n.id}`}
            className="sidebar-item"
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

      {/* Center: placeholder */}
      <div className="panel-main">
        <EmptyState message="Select a note from the list or create a new one" />
      </div>

      {/* Right: Outputs */}
      <div className="panel">
        <div className="section-label">Outputs</div>
        {outputs.length === 0 && (
          <p style={{ fontSize: 13, color: '#999', padding: '0 10px' }}>
            No outputs yet
          </p>
        )}
        {outputs.map((o) => (
          <Link
            key={o.id}
            to={`/outputs/${o.id}`}
            className="sidebar-item"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <span className="item-title">{o.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
