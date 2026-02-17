import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/stores/useProjectStore';
import { EmptyState } from '@/components/EmptyState';

export function ProjectsPage() {
  const { projects, loading, fetchProjects, createProject } =
    useProjectStore();
  const nav = useNavigate();

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async () => {
    const project = await createProject(
      `Screenplay ${new Date().toLocaleDateString()}`,
    );
    nav(`/projects/${project.id}`);
  };

  return (
    <div className="padded">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Projects</h2>
        <button className="btn btn-primary" onClick={() => void handleCreate()}>
          + New Screenplay
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && projects.length === 0 && (
        <EmptyState
          message="No projects yet. Create your first screenplay!"
          action={
            <button
              className="btn btn-primary"
              onClick={() => void handleCreate()}
            >
              + New Screenplay
            </button>
          }
        />
      )}

      <div className="project-grid">
        {projects.map((p) => (
          <Link
            key={p.id}
            to={`/projects/${p.id}`}
            className="project-card"
          >
            <h3>{p.title}</h3>
            <div className="meta">{p.type} &middot; {p.updated_at}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
