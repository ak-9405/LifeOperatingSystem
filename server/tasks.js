import express from 'express';
import { randomUUID } from 'node:crypto';

const validAreas = new Set([
  'money', 'health', 'learning', 'goals', 'reading', 'habits', 'career', 'business', 'relationships',
]);

export async function ensureTaskSchema(pool) {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS life_tasks (' +
      'user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
      'task_id VARCHAR(64) NOT NULL, ' +
      'title VARCHAR(160) NOT NULL, ' +
      'area_slug VARCHAR(32) NOT NULL, ' +
      'estimated_minutes SMALLINT NOT NULL DEFAULT 10 CHECK (estimated_minutes BETWEEN 1 AND 240), ' +
      'completed BOOLEAN NOT NULL DEFAULT FALSE, ' +
      'reminder_time TIME, ' +
      'completed_on DATE, ' +
      'task_date DATE NOT NULL DEFAULT CURRENT_DATE, ' +
      'created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ' +
      'updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ' +
      'PRIMARY KEY (user_id, task_id), ' +
      "CHECK (area_slug IN ('money', 'health', 'learning', 'goals', 'reading', 'habits', 'career', 'business', 'relationships'))" +
    ');' +
    'ALTER TABLE life_tasks ADD COLUMN IF NOT EXISTS completed_on DATE;' +
    'ALTER TABLE life_tasks ADD COLUMN IF NOT EXISTS reminder_time TIME;' +
    'CREATE INDEX IF NOT EXISTS life_tasks_user_date_idx ON life_tasks (user_id, task_date, completed)'
  );
}

export function createTaskRouter(pool, requireAuth) {
  const router = express.Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth);

  router.get('/', async (request, response) => {
    try {
      const result = await pool.query(
        'SELECT task_id, title, area_slug, estimated_minutes, completed, completed_on, reminder_time, task_date ' +
          'FROM life_tasks WHERE user_id = $1 ORDER BY task_date, created_at LIMIT 500',
        [request.user.id],
      );
      return response.json({ tasks: result.rows.map(toPublicTask) });
    } catch (error) {
      console.error('Could not load tasks:', error.message);
      return response.status(503).json({ error: 'Your tasks could not be loaded right now.' });
    }
  });

  router.post('/', async (request, response) => {
    const task = normalizeTask(request.body);
    if (!task) return response.status(400).json({ error: 'Check the task details and try again.' });

    try {
      const result = await pool.query(
        'INSERT INTO life_tasks (user_id, task_id, title, area_slug, estimated_minutes, completed, task_date, completed_on, reminder_time) ' +
          'VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $6 THEN COALESCE($8::date, $7::date) ELSE NULL END, $9) ' +
          'RETURNING task_id, title, area_slug, estimated_minutes, completed, completed_on, reminder_time, task_date',
        [request.user.id, task.id || randomUUID(), task.title, task.areaSlug, task.estimatedMinutes, task.completed, task.taskDate, task.completedOn, task.reminderTime],
      );
      return response.status(201).json({ task: toPublicTask(result.rows[0]) });
    } catch (error) {
      console.error('Could not create a task:', error.message);
      return response.status(503).json({ error: 'Your task could not be saved right now.' });
    }
  });

  router.post('/import', async (request, response) => {
    const tasks = request.body?.tasks;
    if (!Array.isArray(tasks) || tasks.length > 200) {
      return response.status(400).json({ error: 'The task list could not be imported.' });
    }
    const normalized = tasks.map(normalizeTask);
    if (normalized.some((task) => !task || !task.id)) {
      return response.status(400).json({ error: 'Some saved tasks have invalid details.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const task of normalized) {
        await client.query(
          'INSERT INTO life_tasks (user_id, task_id, title, area_slug, estimated_minutes, completed, task_date, completed_on, reminder_time) ' +
            'VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $6 THEN COALESCE($8::date, $7::date) ELSE NULL END, $9) ' +
            'ON CONFLICT (user_id, task_id) DO UPDATE SET title = EXCLUDED.title, area_slug = EXCLUDED.area_slug, ' +
            'estimated_minutes = EXCLUDED.estimated_minutes, completed = EXCLUDED.completed, task_date = EXCLUDED.task_date, ' +
            'completed_on = CASE WHEN EXCLUDED.completed THEN COALESCE(life_tasks.completed_on, EXCLUDED.completed_on) ELSE NULL END, reminder_time = EXCLUDED.reminder_time, updated_at = NOW()',
          [request.user.id, task.id, task.title, task.areaSlug, task.estimatedMinutes, task.completed, task.taskDate, task.completedOn, task.reminderTime],
        );
      }
      await client.query('COMMIT');
      return response.json({ imported: normalized.length });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Could not import guest tasks:', error.message);
      return response.status(503).json({ error: 'Your guest tasks could not be added to the account.' });
    } finally {
      client.release();
    }
  });

  router.put('/:id', async (request, response) => {
    const task = normalizeTask({ ...request.body, id: request.params.id });
    if (!task) return response.status(400).json({ error: 'Check the task details and try again.' });

    try {
      const result = await pool.query(
        'UPDATE life_tasks SET title = $3, area_slug = $4, estimated_minutes = $5, ' +
          'completed_on = CASE WHEN $6 = FALSE THEN NULL WHEN completed = TRUE THEN completed_on ELSE COALESCE($8::date, CURRENT_DATE) END, ' +
          'completed = $6, task_date = $7, reminder_time = $9, updated_at = NOW() ' +
          'WHERE user_id = $1 AND task_id = $2 ' +
          'RETURNING task_id, title, area_slug, estimated_minutes, completed, completed_on, reminder_time, task_date',
        [request.user.id, task.id, task.title, task.areaSlug, task.estimatedMinutes, task.completed, task.taskDate, task.completedOn, task.reminderTime],
      );
      if (!result.rowCount) return response.status(404).json({ error: 'That task was not found.' });
      return response.json({ task: toPublicTask(result.rows[0]) });
    } catch (error) {
      console.error('Could not update a task:', error.message);
      return response.status(503).json({ error: 'Your task could not be updated right now.' });
    }
  });

  router.delete('/:id', async (request, response) => {
    try {
      const result = await pool.query(
        'DELETE FROM life_tasks WHERE user_id = $1 AND task_id = $2 RETURNING task_id',
        [request.user.id, request.params.id],
      );
      if (!result.rowCount) return response.status(404).json({ error: 'That task was not found.' });
      return response.status(204).end();
    } catch (error) {
      console.error('Could not delete a task:', error.message);
      return response.status(503).json({ error: 'Your task could not be deleted right now.' });
    }
  });

  return router;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizeTask(value) {
  if (!value || typeof value !== 'object') return null;
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const areaSlug = typeof value.areaSlug === 'string' ? value.areaSlug : '';
  const estimatedMinutes = Number(value.estimatedMinutes ?? 10);
  const taskDate = typeof value.taskDate === 'string' ? value.taskDate : '';
  const parsedDate = new Date(taskDate + 'T00:00:00Z');
  if (
    (id && !/^[\w-]{1,64}$/.test(id)) ||
    !title || title.length > 160 ||
    !validAreas.has(areaSlug) ||
    !Number.isInteger(estimatedMinutes) || estimatedMinutes < 1 || estimatedMinutes > 240 ||
    Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== taskDate
  ) return null;
  const reminderTime = typeof value.reminderTime === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.reminderTime) ? value.reminderTime : null;
  if (value.reminderTime && !reminderTime) return null;
  const completedOn = typeof value.completedOn === 'string' && validDate(value.completedOn) ? value.completedOn : null;
  return { id, title, areaSlug, estimatedMinutes, completed: value.completed === true, completedOn, taskDate, reminderTime };
}

function toPublicTask(row) {
  return {
    id: row.task_id,
    title: row.title,
    areaSlug: row.area_slug,
    estimatedMinutes: row.estimated_minutes,
    completed: row.completed,
    completedOn: row.completed_on ? (typeof row.completed_on === 'string' ? row.completed_on.slice(0, 10) : row.completed_on.toISOString().slice(0, 10)) : null,
    reminderTime: row.reminder_time ? String(row.reminder_time).slice(0, 5) : null,
    taskDate: typeof row.task_date === 'string' ? row.task_date.slice(0, 10) : row.task_date.toISOString().slice(0, 10),
  };
}