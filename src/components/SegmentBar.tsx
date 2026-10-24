import type { WorkoutSegment } from '../types';
import { segmentColor } from './ui';

/** Proportional horizontal color-coded bar representing a workout's segments. */
export function SegmentBar({ segments }: { segments: WorkoutSegment[] }) {
  const total = segments.reduce((s, seg) => s + seg.distance_meters, 0) || 1;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-border">
      {segments.map((seg) => (
        <div
          key={seg.id}
          title={seg.title}
          style={{
            width: `${(seg.distance_meters / total) * 100}%`,
            backgroundColor: segmentColor[seg.type],
          }}
        />
      ))}
    </div>
  );
}
