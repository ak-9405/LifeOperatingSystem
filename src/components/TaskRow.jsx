import { CalendarClock, Check, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { areas } from '../data/workspace.js';

export default function TaskRow({ task, today, isDemoTask = false, onToggle, onSave, onDelete, onDownloadReminder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(task), [task]);

  const areaTitle = areas.find((area) => area.slug === task.areaSlug)?.title || 'Goals';
  const dueLabel = task.taskDate === today
    ? 'Today'
    : task.taskDate < today
      ? 'Overdue'
      : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(task.taskDate + 'T12:00:00Z'));
  const displayTitle = isDemoTask ? task.title.replace(/^Sample:\s*/i, '') : task.title;

  if (editing) {
    return (
      <form
        className="task-edit-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          const saved = await onSave({ ...draft, title: draft.title.trim() });
          setSaving(false);
          if (saved) setEditing(false);
        }}
      >
        <label className="sr-only">Task title<input autoFocus maxLength={160} required value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
        <div className="task-edit-fields">
          <label>Life area<select value={draft.areaSlug} onChange={(event) => setDraft((current) => ({ ...current, areaSlug: event.target.value }))}>{areas.map((area) => <option key={area.slug} value={area.slug}>{area.title}</option>)}</select></label>
          <label>Due date<input type="date" value={draft.taskDate} onChange={(event) => setDraft((current) => ({ ...current, taskDate: event.target.value }))} required /></label>
          <label>Minutes<input type="number" min="1" max="240" value={draft.estimatedMinutes} onChange={(event) => setDraft((current) => ({ ...current, estimatedMinutes: Number(event.target.value) }))} required /></label>
          <label>Reminder time<input type="time" value={draft.reminderTime || ""} onChange={(event) => setDraft((current) => ({ ...current, reminderTime: event.target.value }))} /></label>
        </div>
        <div className="task-edit-actions">
          <button type="submit" disabled={saving || !draft.title.trim()}>{saving ? 'Saving…' : 'Save task'}</button>
          <button type="button" onClick={() => { setDraft(task); setEditing(false); }}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div className={'brief-task' + (task.completed ? ' brief-task-done' : '')} data-translate-ignore="true">
      <button type="button" className="brief-task-toggle" onClick={() => onToggle(task)} aria-pressed={task.completed}>
        <span className="task-check">{task.completed && <Check size={13} strokeWidth={2.5} />}</span>
        <span className="task-copy">
          <span className="task-title-line"><span className="task-title-text">{displayTitle}</span>{isDemoTask && <span className="demo-tag">DEMO</span>}</span>
          <small>{areaTitle} · {task.estimatedMinutes} MIN · {dueLabel.toUpperCase()}{task.reminderTime ? " · REMINDER " + task.reminderTime : ""}</small>
        </span>
      </button>
      <div className="task-actions">
        {task.reminderTime && <button type="button" aria-label={'Add device reminder for ' + task.title} title="Add alert to device calendar" onClick={() => onDownloadReminder(task)}><CalendarClock size={14} /></button>}
        <button type="button" aria-label={'Edit ' + task.title} title="Edit task" onClick={() => setEditing(true)}><Pencil size={14} /></button>
        <button type="button" aria-label={'Delete ' + task.title} title="Delete task" onClick={() => onDelete(task)}><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
