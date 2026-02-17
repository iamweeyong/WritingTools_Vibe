import { create } from 'zustand';
import type { ResearchTopic, ResearchBrief } from '@/lib/types';
import {
  listTopics,
  createTopic,
  listBriefs,
  createBrief,
} from '@/lib/db';

interface ResearchState {
  topics: ResearchTopic[];
  selectedTopicId: number | null;
  briefs: ResearchBrief[];
  loading: boolean;
  fetchTopics: () => Promise<void>;
  selectTopic: (id: number) => Promise<void>;
  addTopic: (projectId: number, title: string) => Promise<void>;
  addBrief: (payload: {
    title: string;
    summary: string;
    ideas_json: string;
    source_urls_json: string;
  }) => Promise<void>;
}

export const useResearchStore = create<ResearchState>((set, get) => ({
  topics: [],
  selectedTopicId: null,
  briefs: [],
  loading: false,

  fetchTopics: async () => {
    set({ loading: true });
    const topics = await listTopics();
    set({ topics, loading: false });
    if (topics.length > 0 && get().selectedTopicId === null) {
      await get().selectTopic(topics[0].id);
    }
  },

  selectTopic: async (id) => {
    set({ selectedTopicId: id });
    const briefs = await listBriefs(id);
    set({ briefs });
  },

  addTopic: async (projectId, title) => {
    const topic = await createTopic(projectId, title);
    await get().fetchTopics();
    set({ selectedTopicId: topic.id });
  },

  addBrief: async (payload) => {
    const { selectedTopicId } = get();
    if (!selectedTopicId) return;
    await createBrief(selectedTopicId, { ...payload, status: 'new' });
    await get().selectTopic(selectedTopicId);
  },
}));
