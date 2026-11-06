import { ArrowRight, Check, LockKeyhole, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { areas } from '../data/workspace.js';
import './WeeklyReset.css';

function localDateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function currentWeekStart() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  return localDateKey(date);
}

export default function WeeklyReset({ currentUser, isPlus, focusPreferences }) {
  const weekStart = currentWeekStart();
  const [summary, setSummary] = useState(null);
  const [plusSummary, setPlusSummary] = useState(null);
  const [reflection, setReflection] = useState('');
  const [nextFocus, setNextFocus] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!currentUser?.id) return undefined;
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      fetch('/api/insights/weekly?weekStart=' + weekStart, { signal: controller.signal }),
      isPlus ? fetch('/api/insights/weekly/plus?weekStart=' + weekStart, { signal: controller.signal }) : Promise.resolve(null),
    ]).then(async ([weeklyResponse, plusResponse]) => {
      const weekly = await weeklyResponse.json();
      if (!weeklyResponse.ok) throw new Error(weekly.error || 'Your weekly reset could not be loaded.');
      const deeper = plusResponse ? await plusResponse.json() : null;
      if (plusResponse && !plusResponse.ok) throw new Error(deeper.error || 'Your weekly reflection could not be loaded.');
      if (active) {
        setSummary(weekly);
        setReflection(weekly.reflection || '');
        setNextFocus(weekly.nextFocus || '');
        setPlusSummary(deeper);
      }
    }).catch((reason) => { if (reason.name !== 'AbortError' && active) setError(reason.message || 'Your weekly reset could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [currentUser?.id, isPlus, weekStart]);

  async function saveReview(event) {
    event.preventDefault();
    if (!reflection.trim() && !nextFocus.trim()) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/insights/weekly', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, activityDate: localDateKey(new Date()), reflection, nextFocus }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your reset could not be saved.');
      setSummary((current) => ({ ...current, ...result }));
      setMessage('Your weekly reset is saved.');
      window.dispatchEvent(new Event('lifeos:journal-saved'));
    } catch (reason) {
      setError(reason.message || 'Your reset could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  if (!currentUser) return null;
  const areaTitle = areas.find((area) => area.slug === plusSummary?.mostActiveArea)?.title;
  const focusTitles = (focusPreferences?.focusAreas || []).map((slug) => areas.find((area) => area.slug === slug)?.title).filter(Boolean);

  return <section className="weekly-reset-card" aria-labelledby="weekly-reset-title" aria-busy={loading}>
    <div className="weekly-reset-heading"><span className="weekly-reset-icon"><RefreshCw size={16} /></span><div><span className="eyebrow">A MOMENT FOR YOU</span><h2 id="weekly-reset-title">Your weekly reset</h2></div>{summary?.updatedAt && <span className="weekly-reset-saved"><Check size={12} /> Saved</span>}</div>
    <p className="weekly-reset-intro">A gentle look at how the week felt. No streaks to keep and nothing to catch up on.</p>
    {focusTitles.length > 0 && <p className="weekly-reset-priorities"><span>Your starting focus</span><strong>{focusTitles.join(' · ')}</strong>{focusPreferences?.focusIntention && <small>{focusPreferences.focusIntention}</small>}</p>}
    {error && <p className="weekly-reset-error" role="alert">{error}</p>}
    {loading ? <p className="weekly-reset-loading" role="status">Gathering this week…</p> : summary && <>
      <div className="weekly-reset-stats"><span><strong>{summary.activeDays}</strong><small>active days</small></span><span><strong>{summary.notesSaved}</strong><small>notes saved</small></span><span><strong>{summary.tasksCompleted}</strong><small>tasks finished</small></span></div>
      {isPlus && plusSummary && <p className="weekly-reset-plus-summary"><Sparkles size={13} />{areaTitle ? `${areaTitle} was your most active area. ` : ''}You showed up {plusSummary.activeDaysThisWeek} days this week, compared with {plusSummary.activeDaysLastWeek} last week.</p>}
      <details className="weekly-reset-form-wrap" open={Boolean(reflection || nextFocus)}>
        <summary>Take a minute to reflect</summary>
        <form onSubmit={saveReview}>
          <label htmlFor="weekly-reflection">A moment I want to keep</label>
          <textarea id="weekly-reflection" maxLength={2000} value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="What felt good, meaningful, or worth remembering?" disabled={saving} />
          <label htmlFor="weekly-focus">One thing I’d like to make room for next week</label>
          <input id="weekly-focus" maxLength={240} value={nextFocus} onChange={(event) => setNextFocus(event.target.value)} placeholder="A small, kind intention" disabled={saving} />
          {message && <p className="weekly-reset-status" role="status">{message}</p>}
          <div className="weekly-reset-actions"><span>Private to your account</span><button type="submit" className="button button-dark" disabled={saving || (!reflection.trim() && !nextFocus.trim())}>{saving ? 'Saving…' : 'Save this reset'} <ArrowRight size={13} /></button></div>
        </form>
      </details>
      {!isPlus && <Link to="/plus" className="weekly-reset-plus-link"><LockKeyhole size={13} /> Compare weeks and see deeper patterns with Plus <ArrowRight size={13} /></Link>}
    </>}
  </section>;
}
