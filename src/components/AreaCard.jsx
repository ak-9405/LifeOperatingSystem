import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';

export default function AreaCard({ area, entry, demo }) {
  const Icon = area.icon;
  const checkIns = Number(entry?.checkIns || 0);
  const hasPersonalData = Boolean(checkIns || entry?.intention);
  const useSample = demo && !hasPersonalData;
  const value = useSample
    ? area.value
    : checkIns
      ? checkIns + (checkIns === 1 ? ' check-in' : ' check-ins')
      : entry?.intention
        ? 'Intention set'
        : 'No activity yet';
  const detail = useSample
    ? area.detail
    : entry?.intention || (checkIns ? 'Saved check-ins in this area.' : 'Log a check-in or set an intention.');
  const change = useSample
    ? area.change
    : checkIns
      ? checkIns + ' logged'
      : 'READY WHEN YOU ARE';

  return (
    <Link className="area-card" to={'/life-areas/' + area.slug}>
      <span className="area-card-top">
        <span className={'area-icon tone-' + area.tone}><Icon size={18} strokeWidth={1.8} /></span>
        <span className="area-change">
          {useSample && <span className="demo-tag">DEMO</span>}
          {change}
          {useSample && area.change.includes('%') && <ArrowUpRight size={12} />}
        </span>
      </span>
      <span className="area-title">{area.title}</span>
      <strong className="area-value">{value}</strong>
      <span className="area-detail" data-translate-ignore={entry?.intention ? 'true' : undefined}>{detail}</span>
      {useSample && <span className="area-progress"><span style={{ width: area.progress + '%' }} /></span>}
      <span className="area-open-hint">Open area <ArrowRight size={11} /></span>
    </Link>
  );
}
