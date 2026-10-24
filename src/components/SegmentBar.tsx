import type { WorkoutSegment } from '../types';
import { segmentColor } from './ui';

/** Proportional color-coded bar of a workout's structure. */
export function SegmentBar({ segments, height = 10 }: { segments: WorkoutSegment[]; height?: number }) {
  const total = segments.reduce((s, seg) => s + seg.distance_meters, 0) || 1;
  return (
    <div
      className="flex w-full overflow-hidden rounded-full"
      style={{ height, background: '#0c0c11', gap: 2, padding: 2 }}
    >
      {segments.map((seg) => (
        <div
          key={seg.id}
          title={seg.title}
          className="rounded-full"
          style={{
            width: `${(seg.distance_meters / total) * 100}%`,
            background: segmentColor[seg.type],
            boxShadow: `0 0 8px -2px ${segmentColor[seg.type]}`,
          }}
        />
      ))}
    </div>
  );
}
