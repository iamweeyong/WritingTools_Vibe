import { create } from 'zustand';
import type { OutputDoc, OutputSource } from '@/lib/types';
import {
  listOutputs,
  getOutput,
  saveOutput,
  getOutputSources,
} from '@/lib/db';

interface OutputState {
  outputs: OutputDoc[];
  currentOutput: OutputDoc | null;
  sources: OutputSource[];
  loading: boolean;
  fetchOutputs: () => Promise<void>;
  fetchOutput: (id: number) => Promise<void>;
  updateOutput: (output: OutputDoc) => void;
  persistOutput: (output: OutputDoc) => Promise<void>;
}

export const useOutputStore = create<OutputState>((set) => ({
  outputs: [],
  currentOutput: null,
  sources: [],
  loading: false,

  fetchOutputs: async () => {
    const outputs = await listOutputs();
    set({ outputs });
  },

  fetchOutput: async (id) => {
    set({ loading: true });
    const [output, sources] = await Promise.all([
      getOutput(id),
      getOutputSources(id),
    ]);
    set({ currentOutput: output ?? null, sources, loading: false });
  },

  updateOutput: (output) => set({ currentOutput: output }),

  persistOutput: async (output) => {
    await saveOutput(output);
  },
}));
