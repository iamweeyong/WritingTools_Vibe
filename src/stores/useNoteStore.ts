import { create } from 'zustand';
import type { Note } from '@/lib/types';
import { listNotes, createNote, saveNote, deleteNote } from '@/lib/db';
import { extractWikiLinks } from '@/lib/parsers';

interface NoteState {
  notes: Note[];
  loading: boolean;
  fetchNotes: () => Promise<void>;
  addNote: (title: string, isMoc?: boolean) => Promise<Note>;
  updateNote: (note: Note) => void;
  persistNote: (note: Note) => Promise<void>;
  removeNote: (id: number) => Promise<void>;
  getBacklinks: (note: Note) => Note[];
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  loading: false,

  fetchNotes: async () => {
    set({ loading: true });
    const notes = await listNotes();
    set({ notes, loading: false });
  },

  addNote: async (title, isMoc = false) => {
    const note = await createNote(title, isMoc);
    await get().fetchNotes();
    return note;
  },

  updateNote: (note) => {
    set((state) => ({
      notes: state.notes.map((n) => (n.id === note.id ? note : n)),
    }));
  },

  persistNote: async (note) => {
    await saveNote(note);
  },

  removeNote: async (id) => {
    await deleteNote(id);
    await get().fetchNotes();
  },

  getBacklinks: (note) => {
    const { notes } = get();
    return notes.filter(
      (n) =>
        n.id !== note.id && extractWikiLinks(n.body_md).includes(note.title),
    );
  },
}));
