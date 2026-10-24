import type { WorkoutType } from '../types';
import { typeAccent, typeGradient, typeLabel } from './ui';

/** A colored capsule identifying a workout type. */
export function TypeChip({ type, solid = false }: { type: WorkoutType; solid?: boolean }) {
  const accent = typeAccent[type];
  if (solid) {
    const [a, b] = typeGradient[type];
    return (
      <span
        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide text-black"
        style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
      >
        {typeLabel[type]}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide"
      style={{ color: accent, backgroundColor: `${accent}1f` }}
    >
      {typeLabel[type]}
    </span>
  );
}
