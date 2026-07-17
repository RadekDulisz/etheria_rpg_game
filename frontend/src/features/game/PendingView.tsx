import { EmptyState } from '../../components/ui/EmptyState';
import { SectionTitle } from '../../components/ui/SectionTitle';

interface PendingViewProps {
  eyebrow: string;
  title: string;
  description: string;
  message: string;
}

export function PendingView({ eyebrow, title, description, message }: PendingViewProps) {
  return (
    <div className="view-enter">
      <SectionTitle eyebrow={eyebrow} title={title} description={description} />
      <EmptyState title="Ta część świata jest jeszcze zamknięta">{message}</EmptyState>
    </div>
  );
}
