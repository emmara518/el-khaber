import { formatCount } from '../helpers';

import { IconDashboard } from '@/components/icon';


export function MetricCard({
  label,
  value,
  Icon,
  context,
}: {
  label: string;
  value: number | null;
  Icon: typeof IconDashboard;
  context: string;
}) {
  return (
    <div className="card-enter metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">
          <Icon size={20} />
        </span>
      </div>
      <strong className="metric-value tabular">{formatCount(value)}</strong>
      <span className="metric-context">{context}</span>
    </div>
  );
}
