import express from 'express';

export async function ensureHealthSchema(pool) {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS health_daily_metrics (' +
      'user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
      'metric_date DATE NOT NULL, ' +
      'steps INTEGER CHECK (steps BETWEEN 0 AND 100000), ' +
      'sleep_minutes SMALLINT CHECK (sleep_minutes BETWEEN 1 AND 1440), ' +
      'resting_pulse SMALLINT CHECK (resting_pulse BETWEEN 25 AND 240), ' +
      "source VARCHAR(24) NOT NULL DEFAULT 'manual', " +
      'updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ' +
      'PRIMARY KEY (user_id, metric_date)' +
    ');' +
    'CREATE INDEX IF NOT EXISTS health_daily_metrics_user_date_idx ON health_daily_metrics (user_id, metric_date DESC);' +
    'CREATE TABLE IF NOT EXISTS health_goals (' +
      'user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
      "metric_key VARCHAR(16) NOT NULL CHECK (metric_key IN ('steps', 'sleep')), " +
      'target_value INTEGER NOT NULL CHECK (target_value > 0), ' +
      'updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ' +
      'PRIMARY KEY (user_id, metric_key)' +
    ');'
  );
}

export function createHealthRouter(pool, requireAuth) {
  const router = express.Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth);

  router.get('/overview', async (request, response) => {
    try {
      const [metricsResult, goalsResult] = await Promise.all([
        pool.query(
          "SELECT TO_CHAR(metric_date, 'YYYY-MM-DD') AS date, steps, sleep_minutes, resting_pulse, source " +
            'FROM health_daily_metrics WHERE user_id = $1 AND metric_date >= CURRENT_DATE - INTERVAL \'89 days\' ' +
            'ORDER BY metric_date DESC',
          [request.user.id],
        ),
        pool.query(
          'SELECT metric_key, target_value FROM health_goals WHERE user_id = $1 ORDER BY metric_key',
          [request.user.id],
        ),
      ]);
      return response.json({
        days: metricsResult.rows.map((row) => ({
          date: row.date,
          steps: row.steps === null ? null : Number(row.steps),
          sleepMinutes: row.sleep_minutes === null ? null : Number(row.sleep_minutes),
          restingPulse: row.resting_pulse === null ? null : Number(row.resting_pulse),
          source: row.source,
        })),
        goals: Object.fromEntries(goalsResult.rows.map((row) => [row.metric_key, Number(row.target_value)])),
      });
    } catch (error) {
      console.error('Could not load health progress:', error.message);
      return response.status(503).json({ error: 'Your health progress could not be loaded right now.' });
    }
  });

  router.post('/daily', async (request, response) => {
    const date = isDateString(request.body?.date) ? request.body.date : '';
    const steps = optionalInteger(request.body?.steps, 0, 100000);
    const sleepMinutes = optionalInteger(request.body?.sleepMinutes, 1, 1440);
    const restingPulse = optionalInteger(request.body?.restingPulse, 25, 240);
    if (!date || steps === undefined || sleepMinutes === undefined || restingPulse === undefined ||
      (steps === null && sleepMinutes === null && restingPulse === null)) {
      return response.status(400).json({ error: 'Enter a valid date and at least one reading.' });
    }

    try {
      const result = await pool.query(
        'INSERT INTO health_daily_metrics (user_id, metric_date, steps, sleep_minutes, resting_pulse, source) ' +
          "VALUES ($1, $2, $3, $4, $5, 'manual') " +
          'ON CONFLICT (user_id, metric_date) DO UPDATE SET steps = EXCLUDED.steps, ' +
          'sleep_minutes = EXCLUDED.sleep_minutes, resting_pulse = EXCLUDED.resting_pulse, source = EXCLUDED.source, updated_at = NOW() ' +
          "RETURNING TO_CHAR(metric_date, 'YYYY-MM-DD') AS date, steps, sleep_minutes, resting_pulse, source",
        [request.user.id, date, steps, sleepMinutes, restingPulse],
      );
      return response.status(201).json({ day: toPublicDay(result.rows[0]) });
    } catch (error) {
      console.error('Could not save health metrics:', error.message);
      return response.status(503).json({ error: 'Your health readings could not be saved right now.' });
    }
  });

  router.put('/goals', async (request, response) => {
    const steps = optionalInteger(request.body?.steps, 1, 100000);
    const sleepMinutes = optionalInteger(request.body?.sleepMinutes, 1, 1440);
    if (steps === undefined || sleepMinutes === undefined) {
      return response.status(400).json({ error: 'Enter a valid steps and sleep target, or leave a target blank.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [metric, target] of [['steps', steps], ['sleep', sleepMinutes]]) {
        if (target === null) {
          await client.query('DELETE FROM health_goals WHERE user_id = $1 AND metric_key = $2', [request.user.id, metric]);
        } else {
          await client.query(
            'INSERT INTO health_goals (user_id, metric_key, target_value) VALUES ($1, $2, $3) ' +
              'ON CONFLICT (user_id, metric_key) DO UPDATE SET target_value = EXCLUDED.target_value, updated_at = NOW()',
            [request.user.id, metric, target],
          );
        }
      }
      await client.query('COMMIT');
      return response.json({ goals: { steps, sleep: sleepMinutes } });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Could not save health goals:', error.message);
      return response.status(503).json({ error: 'Your health goals could not be saved right now.' });
    } finally {
      client.release();
    }
  });

  router.delete('/daily/:date', async (request, response) => {
    if (!isDateString(request.params.date)) return response.status(400).json({ error: 'Choose a valid date.' });
    try {
      const result = await pool.query(
        'DELETE FROM health_daily_metrics WHERE user_id = $1 AND metric_date = $2 RETURNING metric_date',
        [request.user.id, request.params.date],
      );
      if (!result.rowCount) return response.status(404).json({ error: 'No health readings were saved for that date.' });
      return response.status(204).end();
    } catch (error) {
      console.error('Could not delete health readings:', error.message);
      return response.status(503).json({ error: 'Your health readings could not be deleted right now.' });
    }
  });

  return router;
}

function optionalInteger(value, minimum, maximum) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum ? number : undefined;
}

function isDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function toPublicDay(row) {
  return {
    date: row.date,
    steps: row.steps === null ? null : Number(row.steps),
    sleepMinutes: row.sleep_minutes === null ? null : Number(row.sleep_minutes),
    restingPulse: row.resting_pulse === null ? null : Number(row.resting_pulse),
    source: row.source,
  };
}
