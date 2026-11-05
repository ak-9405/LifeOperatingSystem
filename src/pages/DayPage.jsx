import { ArrowRight, CalendarDays, Clock3, Flower2, LockKeyhole, Plus, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';
import LifeBalancePanel from '../components/LifeBalancePanel.jsx';
import TaskRow from '../components/TaskRow.jsx';
import { areas } from '../data/workspace.js';
import { downloadTaskReminder } from '../lib/tasks.js';

export default function DayPage({currentUser, date, greetingPrefix, totalCheckIns, doneCount, displayedTasks, plannedMinutes, today, language, activityRefreshKey, newTaskTitle, setNewTaskTitle, newTaskArea, setNewTaskArea, newTaskDate, setNewTaskDate, newTaskMinutes, setNewTaskMinutes, newTaskReminderTime, setNewTaskReminderTime, handleAddTask, handleUpdateTask, handleDeleteTask}) {
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
              </div>
            ) : (
              <div className="week-streak week-streak-summary signed-out-note">
                <span className="week-streak-icon"><Sparkles size={15} /></span>
                <span className="streak-copy"><strong>A calmer way to focus</strong><small>Make room for the little things that matter.</small></span>
              </div>
            )}
          </section>

          <section className="dashboard-grid" aria-label="Your day at a glance">
            <article className="brief-card">
              <div className="brief-orbit brief-orbit-one" />
              <div className="brief-orbit brief-orbit-two" />
              <div className="brief-topline">
                <span className="brief-icon"><Sparkles size={14} /></span>
                <span>YOUR MORNING BRIEF</span><span className="brief-divider" /><span className="brief-tailor">A little clarity, for you</span>
              </div>
              <h2>Make space for<br /><em>what moves you.</em></h2>
              <p className="brief-intro">Your life is a lot of little things. Here’s a thoughtful place to begin.</p>
              <div className="brief-rule" />
              <div className="brief-task-heading"><span>YOUR TASKS</span><span className="task-counter">{currentUser ? <>{doneCount} <i>/ {displayedTasks.length} done</i></> : "PRIVATE TASK SPACE"}</span></div>
              {currentUser ? (
              <form className="task-add-form" onSubmit={handleAddTask}>
                <label className="sr-only" htmlFor="new-task-title">Task title</label>
                <input id="new-task-title" type="text" maxLength={160} placeholder="Add one thing you want to do…" value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} required />
                <div className="task-add-fields">
                  <label><span>Life area</span><select value={newTaskArea} onChange={(event) => setNewTaskArea(event.target.value)}>{areas.map((area) => <option key={area.slug} value={area.slug}>{area.title}</option>)}</select></label>
                  <label><span>Due date</span><input type="date" value={newTaskDate} onChange={(event) => setNewTaskDate(event.target.value)} required /></label>
                  <label><span>Minutes</span><select value={newTaskMinutes} onChange={(event) => setNewTaskMinutes(Number(event.target.value))}>{[5, 10, 15, 30, 60].map((minutes) => <option value={minutes} key={minutes}>{minutes}</option>)}</select></label>
                  <button type="submit" disabled={!newTaskTitle.trim()}><Plus size={14} /> Add</button>
                </div>
                <div className="task-reminder-control"><label><span>Reminder time (optional)</span><input type="time" value={newTaskReminderTime} onChange={(event) => setNewTaskReminderTime(event.target.value)} /></label><small>Add a device calendar alert from the task menu.</small></div>
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
                    <TaskRow key={task.id} task={task} today={today} onDownloadReminder={downloadTaskReminder}
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
          </section><div className="workspace-quick-links"><Link to="/progress"><TrendingUp size={20} /><span><strong>Your progress</strong><small>Goals, steps and sleep</small></span><ArrowRight size={15} /></Link><Link to="/life-areas"><Flower2 size={20} /><span><strong>Life areas</strong><small>Set an intention or check in</small></span><ArrowRight size={15} /></Link><Link to="/prompts"><Sparkles size={20} /><span><strong>A moment to reflect</strong><small>Find your next small step</small></span><ArrowRight size={15} /></Link></div></div>;
}
