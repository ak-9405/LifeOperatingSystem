import { ArrowRight, Check, CircleCheck, Target } from 'lucide-react';
import { Link } from 'react-router';
import PageHeader from '../components/PageHeader.jsx';
import WellnessProgress from '../components/WellnessProgress.jsx';
import { areas } from '../data/workspace.js';

export default function ProgressPage({ currentUser, tasks, areaEntries }) {
  const checkIns = Object.values(areaEntries).reduce((sum, entry) => sum + Number(entry.checkIns || 0), 0);
  const completed = tasks.filter((task) => task.completed).length;
  const intentions = Object.values(areaEntries).filter((entry) => entry.intention).length;
  return <div className="route-page">
    <PageHeader eyebrow="PROGRESS AT A GLANCE" title="Your momentum, in view." detail="The small things you record, brought together. Set goals and see what is moving." />
    <div className="progress-summary-grid">
      {[{ label: 'Tasks finished', value: completed, icon: Check }, { label: 'Check-ins recorded', value: checkIns, icon: CircleCheck }, { label: 'Intentions in focus', value: intentions, icon: Target }].map(({ label, value, icon: Icon }) => <article className="progress-summary-card" key={label}><span><Icon size={17} />{label}</span><strong>{currentUser ? value : '—'}</strong><small>{currentUser ? 'Saved to your account' : 'Available in your private workspace'}</small></article>)}
    </div>
    <WellnessProgress authenticated={Boolean(currentUser)} />
    <section className="area-progress-panel" aria-labelledby="area-progress-title">
      <div className="panel-heading"><div><span className="eyebrow">ACROSS YOUR LIFE</span><h2 id="area-progress-title">Where you are showing up.</h2></div><Link className="route-text-link" to="/life-areas">Open life areas <ArrowRight size={14} /></Link></div>
      <div className="area-progress-list">{areas.map(({ slug, title, icon: Icon, tone }) => <Link to={'/life-areas/' + slug} key={slug}><span className={'area-icon tone-' + tone}><Icon size={16} /></span><span><strong>{title}</strong><small data-translate-ignore={areaEntries[slug]?.intention ? 'true' : undefined}>{areaEntries[slug]?.intention || 'No intention set'}</small></span><b>{Number(areaEntries[slug]?.checkIns || 0)}<small>check-ins</small></b><ArrowRight size={14} /></Link>)}</div>
    </section>
  </div>;
}
