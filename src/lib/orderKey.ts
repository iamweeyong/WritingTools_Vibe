import type { Scene } from './types';

export function reindexScenes(scenes: Scene[]): Scene[] {
  return [...scenes]
    .sort((a, b) => a.order_key.localeCompare(b.order_key))
    .map((scene, index) => ({ ...scene, order_key: String.fromCharCode(97 + index) }));
}
