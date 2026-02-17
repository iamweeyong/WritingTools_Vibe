import { create } from 'zustand'

export interface Project {
  id: string
  title: string
}

export interface Note {
  id: string
  title: string
  body?: string
}

interface AppState {
  projects: Project[]
  notes: Note[]
  setProjects: (projects: Project[]) => void
  setNotes: (notes: Note[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  projects: [],
  notes: [],
  setProjects: (projects) => set({ projects }),
  setNotes: (notes) => set({ notes })
}))
