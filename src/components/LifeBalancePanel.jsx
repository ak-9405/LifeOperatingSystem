import { ArrowRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, CircleCheck, Leaf, LockKeyhole, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import './LifeBalancePanel.css';

const areaNames = {
  money: 'Money', health: 'Health', learning: 'Learning', goals: 'Goals',
  reading: 'Reading', habits: 'Habits', career: 'Career', business: 'Business', relationships: 'Relationships',
};
const pad = (value) => String(value).padStart(2, '0');
const keyFor = (year, month, day) => year + '-' + pad(month + 1) + '-' + pad(day);

export default function LifeBalancePanel({ language = 'en', authenticated = false, today, refreshKey = 0 }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [journalRefresh, setJournalRefresh] = useState(0);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const monthKey = year + '-' + pad(monthIndex + 1);
  const monthTitle = new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(month);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const weekdayFormatter = new Intl.DateTimeFormat(language, { weekday: 'short', timeZone: 'UTC' });
  const dayFormatter = new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const weekdays = Array.from({ length: 7 }, (_, index) => weekdayFormatter.format(new Date(Date.UTC(2024, 0, 1 + index))));

  useEffect(() => {
    const refreshJournalActivity = () => setJournalRefresh((value) => value + 1);
    window.addEventListener('lifeos:journal-saved', refreshJournalActivity);
    return () => window.removeEventListener('lifeos:journal-saved', refreshJournalActivity);
  }, []);

  useEffect(() => {
    if (!authenticated) {
      setActivity([]);
      setLoading(false);
      setError('');
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setActivity([]);
    setError('');
    fetch('/api/life-areas/activity?month=' + monthKey, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Your activity could not be loaded.');
        setActivity(result.activity || []);
      })
      .catch((reason) => {
        if (reason.name !== 'AbortError') setError(reason.message || 'Your activity could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [authenticated, journalRefresh, monthKey, refreshKey]);

  const activityByDate = useMemo(() => activity.reduce((all, item) => {
    if (!all[item.date]) all[item.date] = [];
    all[item.date].push(item);
    return all;
  }, {}), [activity]);
  const monthDays = Object.entries(activityByDate).filter(([, items]) => items.reduce((sum, item) => sum + item.count, 0) > 0).length;
  const monthEvents = activity.reduce((sum, item) => sum + item.count, 0);
  const selectedEvents = activityByDate[selectedDate] || [];
  const selectedTotal = selectedEvents.reduce((sum, item) => sum + item.count, 0);
  const selectedDateText = dayFormatter.format(new Date(selectedDate + 'T12:00:00Z'));
  const isCurrentMonth = year === Number(today.slice(0, 4)) && monthIndex === Number(today.slice(5, 7)) - 1;

  function moveMonth(direction) {
    const next = new Date(year, monthIndex + direction, 1);
    if (keyFor(next.getFullYear(), next.getMonth(), 1) > today.slice(0, 7) + '-01') return;
    setMonth(next);
    const nextDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    const day = direction > 0 ? 1 : nextDays;
    setSelectedDate(keyFor(next.getFullYear(), next.getMonth(), day));
  }

  if (!authenticated) {
    return (
      <aside className="pulse-card life-balance-panel activity-calendar activity-locked" aria-labelledby="activity-calendar-title">
        <div className="activity-panel-topline"><span className="eyebrow">YOUR ACTIVITY</span><span className="activity-leaf-mark"><Leaf size={15} /></span></div>
        <div className="activity-locked-heading"><span className="activity-calendar-mark"><CalendarDays size={20} /></span><span className="eyebrow">A MONTH AT A GLANCE</span></div>
        <h3 id="activity-calendar-title">Small steps,<br /><em>in full view.</em></h3>
        <p className="activity-intro">Your calendar fills when you write, log a check-in, or finish a task. It’s a record of your days, shaped by you.</p>
        <div className="activity-locked-note"><LockKeyhole size={16} /><span>Your personal activity appears here once you enter your private workspace.</span></div>
        <span className="activity-locked-foot"><Sparkles size={13} /> Journal writing · check-ins · finished tasks</span>
      </aside>
    );
  }

  return (
    <aside className="pulse-card life-balance-panel activity-calendar" aria-labelledby="activity-calendar-title" aria-busy={loading}>
      <div className="activity-panel-topline"><span className="eyebrow">YOUR ACTIVITY</span><span className="activity-leaf-mark"><Leaf size={15} /></span></div>
      <div className="activity-heading-row">
        <div>
          <span className="eyebrow activity-kicker">A MONTH AT A GLANCE</span>
          <h3 id="activity-calendar-title">Small steps,<br /><em>in full view.</em></h3>
        </div>
        <div className="activity-month-total"><strong>{monthDays}</strong><span>active<br />{monthDays === 1 ? 'day' : 'days'}</span></div>
      </div>
      <div className="activity-intro-row"><p className="activity-intro">Writing, check-ins and finished tasks add a little color to your month.</p><span className="activity-leaf-orbit" aria-hidden="true"><Leaf size={18} /></span></div>

      <div className="activity-month-toolbar">
        <div><span className="activity-month-label">{monthTitle}</span><span className="activity-month-subtitle">{monthEvents} {monthEvents === 1 ? 'recorded activity' : 'recorded activities'}</span></div>
        <div className="activity-month-controls" role="group" aria-label="Change calendar month">
          <button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={16} /></button>
          <button type="button" aria-label="Next month" onClick={() => moveMonth(1)} disabled={isCurrentMonth}><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="activity-calendar-grid" role="group" aria-label={monthTitle + ' activity calendar'}>
        {weekdays.map((day) => <span className="activity-weekday" aria-hidden="true" key={day}>{day}</span>)}
        {Array.from({ length: cellCount }, (_, index) => {
          const dayNumber = index - firstWeekday + 1;
          if (dayNumber < 1 || dayNumber > daysInMonth) return <span className="activity-day-empty" aria-hidden="true" key={'blank-' + index} />;
          const dateKey = keyFor(year, monthIndex, dayNumber);
          const items = activityByDate[dateKey] || [];
          const count = items.reduce((sum, item) => sum + item.count, 0);
          const level = count === 0 ? 0 : count === 1 ? 1 : count < 4 ? 2 : 3;
          const hasJournal = items.some((item) => item.kind === 'journal');
          const formatted = dayFormatter.format(new Date(dateKey + 'T12:00:00Z'));
          return (
            <button
              type="button"
              key={dateKey}
              className={'activity-day' + (hasJournal ? ' has-journal' : '') + (selectedDate === dateKey ? ' is-selected' : '') + (dateKey === today ? ' is-today' : '')}
              data-level={level}
              aria-label={formatted + (count ? ', ' + count + (count === 1 ? ' activity' : ' activities') : ', no activity logged')}
              aria-pressed={selectedDate === dateKey}
              disabled={dateKey > today || loading}
              onClick={() => setSelectedDate(dateKey)}
            >
              <span>{dayNumber}</span>{count > 0 && <i aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className="activity-legend"><span>Quiet</span><i data-level="0" /><i data-level="1" /><i data-level="2" /><i data-level="3" /><span>Full</span></div>

      <section className="activity-day-detail" aria-live="polite" aria-atomic="true">
        <div className="activity-day-detail-head"><div><span className="eyebrow">YOUR DAY</span><strong>{selectedDateText}</strong></div><span className="activity-day-count">{selectedTotal} {selectedTotal === 1 ? 'activity' : 'activities'}</span></div>
        {error ? <p className="activity-day-empty activity-error">{error}</p> : selectedEvents.length ? (
          <ul className="activity-event-list">
            {selectedEvents.map((item) => {
              const area = areaNames[item.areaSlug] || 'your life areas';
              const task = item.kind === 'task';
              const journal = item.kind === 'journal';
              return <li key={item.kind + '-' + item.areaSlug}><span className={'activity-event-icon' + (task ? ' is-task' : '') + (journal ? ' is-journal' : '')}>{task ? <Check size={13} /> : journal ? <BookOpen size={13} /> : <CircleCheck size={14} />}</span><span>{journal ? 'Journal writing' : task ? 'Task finished · ' + area : 'Check-in · ' + area}</span><strong>{item.count > 1 ? '×' + item.count : '1'}</strong></li>;
            })}
          </ul>
        ) : <p className="activity-day-empty">{loading ? 'Gathering your activity…' : 'A little blank space is a good place to start.'}</p>}
      </section>
      <p className="activity-history-note">Older check-in totals have no dates, so only new activity appears on this calendar.</p>
    </aside>
  );
}
