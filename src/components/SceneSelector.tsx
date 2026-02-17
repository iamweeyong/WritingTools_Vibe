import type { Scene } from '@/lib/types';

interface Props {
  scenes: Scene[];
  onSelect: (sceneId: number) => void;
}

export function SceneSelector({ scenes, onSelect }: Props) {
  return (
    <select
      className="scene-selector"
      onChange={(e) => onSelect(Number(e.target.value))}
      defaultValue=""
    >
      <option value="" disabled>
        Select scene...
      </option>
      {scenes.map((s) => (
        <option key={s.id} value={s.id}>
          {s.slugline}
        </option>
      ))}
    </select>
  );
}
