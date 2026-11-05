export function localDateString(value = new Date()) {
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
}

export function makeTaskId() {
  return window.crypto?.randomUUID?.() || 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

export function downloadTaskReminder(task) {
  if (!task.reminderTime) return;
  const start = new Date(task.taskDate + 'T' + task.reminderTime + ':00');
  if (Number.isNaN(start.getTime())) return;
  const end = new Date(start.getTime() + Number(task.estimatedMinutes || 10) * 60 * 1000);
  const escapeText = (value) => String(value).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r?\n/g, '\\n');
  const toUtc = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Life OS//Task reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:' + escapeText(task.id) + '@lifeos.local',
    'DTSTAMP:' + toUtc(new Date()),
    'DTSTART:' + toUtc(start),
    'DTEND:' + toUtc(end),
    'SUMMARY:' + escapeText(task.title),
    'DESCRIPTION:' + escapeText('Life OS task reminder'),
    'BEGIN:VALARM',
    'TRIGGER:PT0S',
    'ACTION:DISPLAY',
    'DESCRIPTION:' + escapeText(task.title),
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const file = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  const safeTitle = task.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'task';
  link.href = url;
  link.download = 'lifeos-reminder-' + safeTitle + '.ics';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
