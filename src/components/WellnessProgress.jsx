import { Activity, CalendarClock, Check, CircleHelp, Footprints, HeartPulse, MoonStar, Watch } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import './WellnessProgress.css';

const providers = [
  { name: 'Apple Health / Apple Watch', detail: 'Needs an iPhone companion app using HealthKit.' },
  { name: 'Fitbit / Pixel Watch', detail: 'Needs Google Health API OAuth setup and access review.' },
  { name: 'Garmin Connect', detail: 'Needs approval for Garmin Health API access.' },
  { name: 'Samsung Health', detail: 'Needs an Android companion using Health Connect or Samsung Health SDK.' },
];

function localDateString(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function formatSleep(minutes) {
  if (minutes === null || minutes === undefined) return '—';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours + 'h' + (remainder ? ' ' + remainder + 'm' : '');
}

function MetricCard({ icon: Icon, label, value, unit, goal, progress, caption }) {
  return (
    <article className="wellness-metric-card">
      <div className="wellness-metric-top">
        <span className="wellness-metric-icon"><Icon size={16} /></span>
        <span>{label}</span>
      </div>
      <strong className="wellness-metric-value">{value}<small>{unit}</small></strong>
      {goal ? (
        <div className="wellness-goal-meter" aria-label={progress + '% of goal'}>
          <span style={{ width: progress + '%' }} />
        </div>
      ) : <div className="wellness-goal-meter wellness-goal-meter-empty" />}
      <small className="wellness-metric-caption">{caption}</small>
      {goal && <span className="wellness-metric-goal">Goal {goal}</span>}
    </article>
  );
}

export default function WellnessProgress({ authenticated }) {
  const today = localDateString();
  const [days, setDays] = useState([]);
  const [goals, setGoals] = useState({ steps: null, sleep: null });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editingDay, setEditingDay] = useState(false);
  const [editingGoals, setEditingGoals] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [entry, setEntry] = useState({ date: today, steps: '', sleepHours: '', restingPulse: '' });
  const [goalDraft, setGoalDraft] = useState({ steps: '', sleepHours: '' });

  useEffect(() => {
    if (!authenticated) {
      setDays([]);
      setGoals({ steps: null, sleep: null });
      return undefined;
    }
    const controller = new AbortController();
    fetch('/api/health/overview', { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Health progress could not be loaded.');
        setDays(result.days || []);
        setGoals({ steps: result.goals?.steps ?? null, sleep: result.goals?.sleep ?? null });
      })
      .catch((error) => { if (error.name !== 'AbortError') setMessage(error.message); });
    return () => controller.abort();
  }, [authenticated]);

  useEffect(() => {
    setGoalDraft({
      steps: goals.steps ? String(goals.steps) : '',
      sleepHours: goals.sleep ? (goals.sleep / 60).toFixed(1).replace(/\.0$/, '') : '',
    });
  }, [goals.steps, goals.sleep]);

  const todayEntry = days.find((day) => day.date === today) || null;
  const weekStart = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return localDateString(start);
  }, [today]);
  const week = days.filter((day) => day.date >= weekStart && day.date <= today);
  const trackedDays = week.filter((day) => day.steps !== null || day.sleepMinutes !== null || day.restingPulse !== null).length;
  const average = (key) => {
    const values = week.map((day) => day[key]).filter((value) => value !== null && value !== undefined);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  };
  const averageSteps = average('steps');
  const averageSleep = average('sleepMinutes');
  const stepsProgress = goals.steps && todayEntry?.steps !== null && todayEntry?.steps !== undefined
    ? Math.min(100, Math.round(todayEntry.steps / goals.steps * 100))
    : 0;
  const sleepProgress = goals.sleep && todayEntry?.sleepMinutes
    ? Math.min(100, Math.round(todayEntry.sleepMinutes / goals.sleep * 100))
    : 0;

  function openEntryForm() {
    setMessage('');
    setEntry({
      date: today,
      steps: todayEntry?.steps ?? '',
      sleepHours: todayEntry?.sleepMinutes ? String((todayEntry.sleepMinutes / 60).toFixed(1)) : '',
      restingPulse: todayEntry?.restingPulse ?? '',
    });
    setEditingDay(true);
  }

  async function saveEntry(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const body = {
      date: entry.date,
      steps: entry.steps === '' ? null : Number(entry.steps),
      sleepMinutes: entry.sleepHours === '' ? null : Math.round(Number(entry.sleepHours) * 60),
      restingPulse: entry.restingPulse === '' ? null : Number(entry.restingPulse),
    };
    try {
      const response = await fetch('/api/health/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Readings could not be saved.');
      setDays((current) => [result.day, ...current.filter((day) => day.date !== result.day.date)].sort((a, b) => b.date.localeCompare(a.date)));
      setEditingDay(false);
      setMessage('Readings saved to your private progress.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveGoals(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const steps = goalDraft.steps === '' ? null : Number(goalDraft.steps);
    const sleepMinutes = goalDraft.sleepHours === '' ? null : Math.round(Number(goalDraft.sleepHours) * 60);
    try {
      const response = await fetch('/api/health/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps, sleepMinutes }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Goals could not be saved.');
      setGoals({ steps: result.goals.steps, sleep: result.goals.sleep });
      setEditingGoals(false);
      setMessage('Your goals are linked to the progress cards.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="wellness-progress" aria-labelledby="wellness-progress-title">
      <div className="wellness-heading">
        <div>
          <span className="eyebrow"><Activity size={13} /> HEALTH & GOALS</span>
          <h3 id="wellness-progress-title">Wellness progress</h3>
          <p>Steps, sleep, and pulse alongside the goals you choose.</p>
        </div>
        {authenticated && (
          <button type="button" className="wellness-setup-button" onClick={() => setSetupOpen((open) => !open)} aria-expanded={setupOpen}>
            <Watch size={15} /> Device setup
          </button>
        )}
      </div>

      {!authenticated ? (
        <div className="wellness-locked"><span><Watch size={17} /></span><p>Wearable readings and personal goals appear in your private workspace.</p></div>
      ) : (
        <>
          <div className="wellness-connection">
            <span className="wellness-connection-icon"><Watch size={17} /></span>
            <span><strong>No device connected</strong><small>Enter readings below. Automatic sync will show here after a device integration is configured.</small></span>
            <span className="wellness-source-status">MANUAL READY</span>
          </div>

          {setupOpen && (
            <div className="wellness-provider-list">
              <div className="wellness-provider-heading"><CircleHelp size={15} /><span>Connection setup</span></div>
              {providers.map((provider) => (
                <div className="wellness-provider-row" key={provider.name}>
                  <strong>{provider.name}</strong><span>{provider.detail}</span>
                </div>
              ))}
              <p>This browser view does not claim access to your watch. Your readings stay manual until a companion app or approved provider connection is added.</p>
            </div>
          )}

          <div className="wellness-week-summary">
            <span><strong>{trackedDays}</strong><small>tracked days this week</small></span>
            <span><strong>{averageSteps === null ? '—' : averageSteps.toLocaleString('en-GB')}</strong><small>average steps / day</small></span>
            <span><strong>{formatSleep(averageSleep)}</strong><small>average sleep</small></span>
          </div>

          <div className="wellness-metric-grid">
            <MetricCard icon={Footprints} label="Steps today" value={todayEntry?.steps === null || todayEntry?.steps === undefined ? '—' : todayEntry.steps.toLocaleString('en-GB')} unit=" steps" goal={goals.steps ? goals.steps.toLocaleString('en-GB') + ' steps' : null} progress={stepsProgress} caption={goals.steps ? stepsProgress + '% of your daily target' : 'Set a steps target to track progress'} />
            <MetricCard icon={MoonStar} label="Sleep" value={formatSleep(todayEntry?.sleepMinutes)} unit="" goal={goals.sleep ? formatSleep(goals.sleep) : null} progress={sleepProgress} caption={goals.sleep ? sleepProgress + '% of your nightly target' : 'Set a sleep target to track progress'} />
            <MetricCard icon={HeartPulse} label="Average pulse" value={todayEntry?.restingPulse ?? '—'} unit=" bpm" goal={null} progress={0} caption={todayEntry?.restingPulse ? 'Daily reading · shown without interpretation' : 'No pulse reading for today'} />
          </div>

          {todayEntry?.source && <div className="wellness-data-source">Latest reading source: <strong>{todayEntry.source === 'demo' ? 'SAMPLE DATA' : todayEntry.source.toUpperCase()}</strong></div>}

          <div className="wellness-actions">
            <button type="button" onClick={openEntryForm}><CalendarClock size={14} /> {todayEntry ? 'Edit daily readings' : 'Add daily readings'}</button>
            <button type="button" onClick={() => { setMessage(''); setEditingGoals((open) => !open); }}><Check size={14} /> {editingGoals ? 'Close goals' : 'Set goals'}</button>
          </div>

          {editingDay && (
            <form className="wellness-edit-form" onSubmit={saveEntry}>
              <div className="wellness-form-title"><strong>Daily readings</strong><span>Optional fields; enter only what you track.</span></div>
              <label>Date<input type="date" max={today} value={entry.date} onChange={(event) => setEntry((current) => ({ ...current, date: event.target.value }))} required /></label>
              <label>Steps<input type="number" min="0" max="100000" step="1" value={entry.steps} onChange={(event) => setEntry((current) => ({ ...current, steps: event.target.value }))} placeholder="e.g. 7200" /></label>
              <label>Sleep (hours)<input type="number" min="1" max="24" step="0.1" value={entry.sleepHours} onChange={(event) => setEntry((current) => ({ ...current, sleepHours: event.target.value }))} placeholder="e.g. 7.5" /></label>
              <label>Average pulse (bpm)<input type="number" min="25" max="240" step="1" value={entry.restingPulse} onChange={(event) => setEntry((current) => ({ ...current, restingPulse: event.target.value }))} placeholder="e.g. 62" /></label>
              <div className="wellness-form-actions"><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save readings'}</button><button type="button" onClick={() => setEditingDay(false)}>Cancel</button></div>
            </form>
          )}

          {editingGoals && (
            <form className="wellness-edit-form wellness-goal-form" onSubmit={saveGoals}>
              <div className="wellness-form-title"><strong>Your goals</strong><span>Choose your own targets. Leave blank to remove one.</span></div>
              <label>Daily steps target<input type="number" min="1" max="100000" step="1" value={goalDraft.steps} onChange={(event) => setGoalDraft((current) => ({ ...current, steps: event.target.value }))} placeholder="steps per day" /></label>
              <label>Sleep target (hours)<input type="number" min="1" max="24" step="0.1" value={goalDraft.sleepHours} onChange={(event) => setGoalDraft((current) => ({ ...current, sleepHours: event.target.value }))} placeholder="hours per night" /></label>
              <div className="wellness-form-actions"><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save goals'}</button><button type="button" onClick={() => setEditingGoals(false)}>Cancel</button></div>
            </form>
          )}
          <div className="wellness-footnote"><MoonStar size={13} /><span>Pulse is displayed as a reading only. Your goals and readings are private to your account.</span></div>
        </>
      )}
      {message && <p className="wellness-status" role="status">{message}</p>}
    </section>
  );
}