import { formatItemGrade } from '../../lib/item-grades';
import type { ItemGrade } from '../../types/game';

export function GradeBadge({ grade }: { grade: ItemGrade }) {
  return <span className={`grade-badge grade-badge-${grade.toLowerCase().replace('_', '-')}`}>{formatItemGrade(grade)}</span>;
}
