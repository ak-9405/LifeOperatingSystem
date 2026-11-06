import { ArrowRight, BookOpenCheck, CalendarDays, CircleCheck, Clock3, Flower2, LockKeyhole, Plus, Sparkles, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import LifeBalancePanel from '../components/LifeBalancePanel.jsx';
import QuickNoteModal from '../components/QuickNoteModal.jsx';
import TaskRow from '../components/TaskRow.jsx';
import { areas } from '../data/workspace.js';
import { downloadTaskReminder } from '../lib/tasks.js';

export default function DayPage({currentUser, date, greetingPrefix, totalCheckIns, doneCount, displayedTasks, plannedMinutes, today, language, activityRefreshKey, newTaskTitle, setNewTaskTitle, newTaskArea, setNewTaskArea, newTaskDate, setNewTaskDate, newTaskMinutes, setNewTaskMinutes, newTaskReminderTime, setNewTaskReminderTime, handleAddTask, handleUpdateTask, handleDeleteTask, onCheckIn, onOpenAccount}) {
  const [checkInArea, setCheckInArea] = useState('');
  const [checkInPending, setCheckInPending] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState('');
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);

  async function saveQuickCheckIn(event) {
    event.preventDefault();
    if (!checkInArea || checkInPending) return;
    const details = event.currentTarget.closest('details');
    setCheckInPending(true);
    const succeeded = await onCheckIn(checkInArea);
    setCheckInPending(false);
    if (succeeded) {
      const areaName = areas.find((area) => area.slug === checkInArea)?.title || 'Life area';
      setCheckInMessage(`${areaName} check-in saved.`);
      setCheckInArea('');
      if (details) details.open = false;
    }
  }

 return <div className="route-page day-page"><section className="welcome" id="today">
            <div className="welcome-copy">
              <span className="eyebrow welcome-eyebrow"><CalendarDays size={13} /> {date}</span>
              <h1>{greetingPrefix}{currentUser ? <>,<br /><em data-translate-ignore="true">{currentUser.name.trim().split(/\s+/)[0]}.</em></> : '.'}</h1>
              <p className="welcome-subtitle">The day is yours. Let’s make a little room for what matters.</p>
            </div>
            {currentUser ? (
              <div className="week-streak week-streak-summary">
                <span className="week-streak-icon"><Sparkles size={15} /></span>
                <span className="streak-copy"><strong>{totalCheckIns ? 'Your recorded activity' : 'A fresh start'}</strong><small>{totalCheckIns ? totalCheckIns + (totalCheckIns === 1 ? ' check-in saved across your areas' : ' check-ins saved across your areas') : 'Log a check-in to start your own picture.'}</small></span>
                <details className="home-checkin">
                  <summary>Log a check-in</summary>
                  <form onSubmit={saveQuickCheckIn}>
                    <label htmlFor="home-checkin-area">Choose an area</label>
                    <select id="home-checkin-area" value={checkInArea} onChange={(event) => setCheckInArea(event.target.value)} required>
                      <option value="" disabled>Select an area</option>
                      {areas.map((area) => <option value={area.slug} key={area.slug}>{area.title}</option>)}
                    </select>
                    <button type="submit" disabled={!checkInArea || checkInPending}><CircleCheck size={15} />{checkInPending ? 'Saving…' : 'Save check-in'}</button>
                  </form>
                </details>
                {checkInMessage && <span className="home-checkin-status" role="status">{checkInMessage}</span>}
              </div>
            ) : (
              <div className="week-streak week-streak-summary signed-out-note">
                <span className="week-streak-icon"><Sparkles size={15} /></span>
                <span className="streak-copy"><strong>A calmer way to focus</strong><small>Make room for the little things that matter.</small></span>
              </div>
            )}
          </section>

          {currentUser?.demo && <aside className="day-demo-note"><span><Sparkles size={14} /> LOCAL DEMO</span><p>{displayedTasks.some((task) => task.id === 'demo-walk') ? 'The task marked DEMO and wellness readings are sample data for this preview.' : 'Wellness readings are sample data for this preview.'}</p></aside>}

          <section className="dashboard-grid" aria-label="Your day at a glance">
            <article className="brief-card">
              <div className="brief-orbit brief-orbit-one" />
              <div className="brief-orbit brief-orbit-two" />
              <div className="brief-topline">
                <span className="brief-icon"><Sparkles size={14} /></span>
                <span>YOUR DAILY BRIEF</span><span className="brief-divider" /><span className="brief-tailor">A little clarity, for you</span>
              </div>
              <h2>Make space for<br /><em>what moves you.</em></h2>
              <p className="brief-intro">Your life is a lot of little things. Here’s a thoughtful place to begin.</p>
              <div className="brief-rule" />
              <div className="brief-task-heading"><span>YOUR TASKS</span><span className="task-counter">{currentUser ? <>{doneCount} <i>/ {displayedTasks.length} done</i></> : "PRIVATE TASK SPACE"}</span></div>
              {currentUser ? (
              <form className="task-add-form" onSubmit={handleAddTask}>
                <label className="sr-only" htmlFor="new-task-title">Task title</label>
                <div className="task-add-primary">
                  <input id="new-task-title" type="text" maxLength={160} placeholder="Add one thing you want to do…" value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} required />
                  <button type="submit" disabled={!newTaskTitle.trim()}><Plus size={14} /> Add</button>
                </div>
                <details className="task-add-details">
                  <summary>More options <small>Life area, due date, duration, reminder</small></summary>
                  <div className="task-add-fields">
                    <label><span>Life area</span><select value={newTaskArea} onChange={(event) => setNewTaskArea(event.target.value)}>{areas.map((area) => <option key={area.slug} value={area.slug}>{area.title}</option>)}</select></label>
                    <label><span>Due date</span><input type="date" value={newTaskDate} onChange={(event) => setNewTaskDate(event.target.value)} required /></label>
                    <label><span>Minutes</span><select value={newTaskMinutes} onChange={(event) => setNewTaskMinutes(Number(event.target.value))}>{[5, 10, 15, 30, 60].map((minutes) => <option value={minutes} key={minutes}>{minutes}</option>)}</select></label>
                  </div>
                  <div className="task-reminder-control"><label><span>Reminder time (optional)</span><input type="time" value={newTaskReminderTime} onChange={(event) => setNewTaskReminderTime(event.target.value)} /></label><small>Add a device calendar alert from the task menu.</small></div>
                </details>
              </form>
              ) : (
                <div className="task-auth-gate">
                  <LockKeyhole size={18} />
                  <p>Your private task space is ready when you are.</p>
                </div>
              )}
              {currentUser && (displayedTasks.length ? (
                <div className="brief-tasks">
                  {displayedTasks.map((task) => (
                    <TaskRow key={task.id} task={task} today={today} isDemoTask={Boolean(currentUser?.demo && task.id === 'demo-walk')} onDownloadReminder={downloadTaskReminder}
                      onToggle={(item) => handleUpdateTask({ ...item, completed: !item.completed })}
                      onSave={handleUpdateTask} onDelete={handleDeleteTask} />
                  ))}
                </div>
              ) : <p className="empty-tasks">No tasks yet. Add one small thing you want to make time for.</p>)}

              <div className="brief-bottom">
                <span><Clock3 size={14} /> {plannedMinutes ? plannedMinutes + ' MINUTES PLANNED' : 'Nothing planned yet'}</span>
                <span>{currentUser ? 'Saved to your account' : 'Your tasks are private to your account'}</span>
              </div>
            </article>

            <LifeBalancePanel language={language} authenticated={Boolean(currentUser)} today={today} refreshKey={activityRefreshKey} />
          </section><div className="workspace-quick-links"><Link to="/progress"><TrendingUp size={20} /><span><strong>Your progress</strong><small>Goals, steps and sleep</small></span><ArrowRight size={15} /></Link><Link to="/life-areas"><Flower2 size={20} /><span><strong>Life areas</strong><small>Set an intention or check in</small></span><ArrowRight size={15} /></Link><button type="button" className="quick-note-link" onClick={() => setQuickNoteOpen(true)}><BookOpenCheck size={20} /><span><strong>Write what’s on your mind</strong><small>Open a page and write freely</small></span><ArrowRight size={15} /></button></div>{quickNoteOpen && <QuickNoteModal signedIn={Boolean(currentUser)} onClose={() => setQuickNoteOpen(false)} onOpenAccount={() => { setQuickNoteOpen(false); onOpenAccount(); }} />}</div>;
}
