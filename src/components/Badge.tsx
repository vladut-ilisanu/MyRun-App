import type { ComplianceBadge } from '../types';
import { badgeMeta } from './ui';

export function ComplianceBadgePill({ badge }: { badge: ComplianceBadge }) {
  const m = badgeMeta[badge];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color: m.color, backgroundColor: m.bg }}
    >
      {m.label}
    </span>
  );
}
