import { create } from 'zustand';
import type { Scene } from '@/lib/types';
import {
  listScenes,
  createScene,
  saveScene,
  deleteScene,
} from '@/lib/db';
import { nextOrderKey, reindexScenes } from '@/lib/orderKey';

interface SceneState {
  scenes: Scene[];
  activeSceneId: number | null;
  loading: boolean;
  setActiveScene: (id: number | null) => void;
  fetchScenes: (projectId: number) => Promise<void>;
  addScene: (projectId: number) => Promise<void>;
  updateScene: (scene: Scene) => void;
  persistScene: (scene: Scene) => Promise<void>;
  removeScene: (sceneId: number, projectId: number) => Promise<void>;
  moveScene: (idx: number, dir: -1 | 1, projectId: number) => Promise<void>;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scenes: [],
  activeSceneId: null,
  loading: false,

  setActiveScene: (id) => set({ activeSceneId: id }),

  fetchScenes: async (projectId) => {
    set({ loading: true });
    const scenes = await listScenes(projectId);
    set({ scenes, loading: false });
    if (scenes.length > 0 && get().activeSceneId === null) {
      set({ activeSceneId: scenes[0].id });
    }
  },

  addScene: async (projectId) => {
    const { scenes } = get();
    const key = nextOrderKey(scenes);
    const scene = await createScene(projectId, key);
    await get().fetchScenes(projectId);
    set({ activeSceneId: scene.id });
  },

  updateScene: (scene) => {
    set((state) => ({
      scenes: state.scenes.map((s) => (s.id === scene.id ? scene : s)),
    }));
  },

  persistScene: async (scene) => {
    await saveScene(scene);
  },

  removeScene: async (sceneId, projectId) => {
    const { scenes, activeSceneId } = get();
    await deleteScene(sceneId);
    if (activeSceneId === sceneId) {
      const remaining = scenes.filter((s) => s.id !== sceneId);
      set({ activeSceneId: remaining[0]?.id ?? null });
    }
    await get().fetchScenes(projectId);
  },

  moveScene: async (idx, dir, _projectId) => {
    const { scenes } = get();
    const target = idx + dir;
    if (target < 0 || target >= scenes.length) return;
    const copy = [...scenes];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    const reindexed = reindexScenes(copy);
    set({ scenes: reindexed });
    for (const s of reindexed) await saveScene(s);
  },
}));
