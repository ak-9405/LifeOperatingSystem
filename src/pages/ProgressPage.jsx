import { ArrowRight, Check, CircleCheck, LockKeyhole, Sparkles, Target, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import PageHeader from '../components/PageHeader.jsx';
import WellnessProgress from '../components/WellnessProgress.jsx';
import { areas } from '../data/workspace.js';
import './PlusPage.css';

export default function ProgressPage({ currentUser, tasks, areaEntries, isPlus }) {
  const [reflection, setReflection] = useState(null);
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [reflectionError, setReflectionError] = useState('');
  const checkIns = Object.values(areaEntries).reduce((sum, entry) => sum + Number(entry.checkIns || 0), 0);
  const completed = tasks.filter((task) => task.completed).length;
  const activeAreas = Object.values(areaEntries).filter((entry) => Number(entry.checkIns || 0) > 0).length;

  useEffect(() => {
    if (!currentUser || !isPlus) {
      setReflection(null);
      return undefined;
    }
    const controller = new AbortController();
    let active = true;
    setReflectionLoading(true);
    setReflectionError('');
    fetch('/api/insights', { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Your reflection could not be loaded.');
        if (active) setReflection(result);
      })
      .catch((error) => { if (error.name !== 'AbortError' && active) setReflectionError(error.message); })
      .finally(() => { if (active) setReflectionLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [currentUser?.id, isPlus]);
  return <div className="route-page">
    <PageHeader eyebrow="PROGRESS AT A GLANCE" title="Your momentum, in view." detail="The small things you record, brought together. Set goals and see what is moving." />
    <div className="progress-summary-grid">
      {[{ label: 'Tasks finished', value: completed, icon: Check }, { label: 'Check-ins recorded', value: checkIns, icon: CircleCheck }, { label: 'Life areas active', value: activeAreas, icon: Target }].map(({ label, value, icon: Icon }) => <article className="progress-summary-card" key={label}><span><Icon size={17} />{label}</span><strong>{currentUser ? value : '—'}</strong><small>{currentUser ? 'Saved to your account' : 'Available in your private workspace'}</small></article>)}
    </div>
    <WellnessProgress authenticated={Boolean(currentUser)} />
    <section className={'plus-reflection-panel' + (!isPlus ? ' is-locked' : '')} aria-labelledby="plus-reflection-title">
      <div className="plus-reflection-heading"><span className="plus-reflection-icon">{isPlus ? <TrendingUp size={17} /> : <LockKeyhole size={16} />}</span><div><span className="eyebrow">{isPlus ? 'LIFE OS PLUS · LAST 30 DAYS' : 'LIFE OS PLUS'}</span><h2 id="plus-reflection-title">A clearer view of your rhythm.</h2><p>{isPlus ? 'A quiet reflection based on your recorded check-ins and completed tasks.' : 'Plus turns your recent activity into a gentle weekly and monthly reflection.'}</p></div></div>
      {isPlus ? reflectionLoading ? <p className="plus-reflection-loading" role="status">Gathering your recent activity…</p> : reflectionError ? <p className="plus-reflection-loading" role="alert">{reflectionError}</p> : reflection && <>
        <p className="plus-reflection-copy">{reflection.activeDaysLast7 === 0 ? 'It has been a quiet week. There is no need to catch up; one small step is enough whenever you are ready.' : `You showed up on ${reflection.activeDaysLast7} of the last 7 days. Your previous week had ${reflection.activeDaysPrevious7} active ${reflection.activeDaysPrevious7 === 1 ? 'day' : 'days'}.`}</p>
        <div className="plus-reflection-stats"><span><strong>{reflection.activeDaysLast7}</strong><small>active days this week</small></span><span><strong>{reflection.checkInsLast30}</strong><small>check-ins this month</small></span><span><strong>{reflection.tasksCompletedLast30}</strong><small>tasks completed</small></span><span><strong>{reflection.mostActiveArea ? reflection.mostActiveArea.replace(/^./, (letter) => letter.toUpperCase()) : '—'}</strong><small>area you returned to most</small></span></div>
      </> : <div className="plus-reflection-locked"><span><Sparkles size={15} />The core progress overview stays free; personal 7-day and 30-day reflections are part of Plus.</span><Link to="/plus">See Life OS Plus <ArrowRight size={14} /></Link></div>}
    </section>
    <section className="area-progress-panel" aria-labelledby="area-progress-title">
      <div className="panel-heading"><div><span className="eyebrow">ACROSS YOUR LIFE</span><h2 id="area-progress-title">Where you are showing up.</h2></div><Link className="route-text-link" to="/life-areas">Open life areas <ArrowRight size={14} /></Link></div>
      <div className="area-progress-list">{areas.map(({ slug, title, icon: Icon, tone }) => <Link to={'/life-areas/' + slug} key={slug}><span className={'area-icon tone-' + tone}><Icon size={16} /></span><span><strong>{title}</strong><small data-translate-ignore={areaEntries[slug]?.intention ? 'true' : undefined}>{areaEntries[slug]?.intention || (Number(areaEntries[slug]?.checkIns || 0) ? 'Notes and check-ins saved' : 'Write a note to begin')}</small></span><b>{Number(areaEntries[slug]?.checkIns || 0)}<small>check-ins</small></b><ArrowRight size={14} /></Link>)}</div>
    </section>
  </div>;
}
