import type { Scene } from './types';

const GAP = 10000;

/** 씬 리스트 끝에 추가할 때 새 order_key 반환 */
export function nextOrderKey(scenes: Scene[]): string {
  if (scenes.length === 0) return String(GAP);
  const maxKey = Math.max(...scenes.map((s) => parseInt(s.order_key, 10)));
  return String(maxKey + GAP);
}

/** 두 키 사이의 중간값 생성 (삽입용) */
export function midOrderKey(before: string, after: string): string {
  const a = parseInt(before, 10);
  const b = parseInt(after, 10);
  const mid = Math.floor((a + b) / 2);
  if (mid === a || mid === b) return '';
  return String(mid);
}

/** 전체 재번호: 간격 유지하며 재배열 */
export function reindexScenes(scenes: Scene[]): Scene[] {
  return scenes.map((scene, index) => ({
    ...scene,
    order_key: String((index + 1) * GAP),
  }));
}
