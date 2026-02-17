import { create } from 'zustand';
import type { Project } from '@/lib/types';
import { listProjects, createScreenplayProject } from '@/lib/db';

interface ProjectState {
  projects: Project[];
  loading: boolean;
  fetchProjects: () => Promise<void>;
  createProject: (title: string) => Promise<Project>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  fetchProjects: async () => {
    set({ loading: true });
    const projects = await listProjects();
    set({ projects, loading: false });
  },
  createProject: async (title: string) => {
    const project = await createScreenplayProject(title);
    await get().fetchProjects();
    return project;
  },
}));
