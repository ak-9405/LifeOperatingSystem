import express from 'express';

const validAreas = new Set([
  'money',
  'health',
  'learning',
  'goals',
  'reading',
  'habits',
  'career',
  'business',
  'relationships',
]);
export function createLifeAreaRouter(pool, requireAuth) {
  const router = express.Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth);

  router.post('/import', async (request, response) => {
    const areas = request.body?.areas;
    if (!Array.isArray(areas) || areas.length > validAreas.size) {
      return response.status(400).json({ error: 'The saved life areas could not be imported.' });
    }
    for (const area of areas) {
      if (
        !area || !validAreas.has(area.slug) ||
        typeof area.intention !== 'string' || area.intention.length > 240 ||
        !Number.isInteger(Number(area.checkIns)) || Number(area.checkIns) < 0 || Number(area.checkIns) > 10000
      ) return response.status(400).json({ error: 'Some saved life area details are invalid.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const area of areas) {
        if (!area.intention.trim() && Number(area.checkIns) === 0) continue;
        await client.query(
          'INSERT INTO life_area_updates (user_id, area_slug, intention, check_ins) VALUES ($1, $2, $3, $4) ' +
            'ON CONFLICT (user_id, area_slug) DO UPDATE SET ' +
            "intention = CASE WHEN EXCLUDED.intention = '' THEN life_area_updates.intention ELSE EXCLUDED.intention END, " +
            'check_ins = GREATEST(life_area_updates.check_ins, EXCLUDED.check_ins), updated_at = NOW()',
          [request.user.id, area.slug, area.intention.trim(), Number(area.checkIns)],
        );
      }
      await client.query('COMMIT');
      return response.json({ imported: areas.length });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Could not import guest life areas:', error.message);
      return response.status(503).json({ error: 'Your guest life areas could not be added to the account.' });
    } finally {
      client.release();
    }
  });

  router.get('/activity', async (request, response) => {
    const month = typeof request.query.month === 'string' ? request.query.month : '';
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return response.status(400).json({ error: 'Choose a valid calendar month.' });
    }
    const [year, monthNumber] = month.split('-').map(Number);
    const start = month + '-01';
    const end = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);

    try {
      const result = await pool.query(
        'WITH activity AS (' +
          "SELECT activity_date AS activity_day, area_slug, 'check-in'::text AS kind " +
            'FROM life_area_check_ins WHERE user_id = $1 AND activity_date >= $2 AND activity_date < $3 ' +
          'UNION ALL ' +
          "SELECT completed_on AS activity_day, area_slug, 'task'::text AS kind " +
            'FROM life_tasks WHERE user_id = $1 AND completed = TRUE AND completed_on >= $2 AND completed_on < $3 ' +
          'UNION ALL ' +
          "SELECT activity_date AS activity_day, ''::text AS area_slug, 'journal'::text AS kind " +
            'FROM life_area_journal_activity WHERE user_id = $1 AND activity_date >= $2 AND activity_date < $3' +
        ') SELECT TO_CHAR(activity_day, \'YYYY-MM-DD\') AS date, kind, area_slug, COUNT(*)::integer AS count ' +
          'FROM activity GROUP BY activity_day, kind, area_slug ORDER BY activity_day, kind, area_slug',
        [request.user.id, start, end],
      );
      return response.json({ month, activity: result.rows.map((row) => ({
        date: row.date, kind: row.kind, areaSlug: row.area_slug, count: Number(row.count),
      })) });
    } catch (error) {
      console.error('Could not load dated activity:', error.message);
      return response.status(503).json({ error: 'Your activity calendar could not be loaded right now.' });
    }
  });

  router.get('/', async (request, response) => {
    try {
      const result = await pool.query(
        'SELECT area_slug, intention, check_ins, updated_at FROM life_area_updates WHERE user_id = $1',
        [request.user.id],
      );
      return response.json({
        areas: result.rows.map((row) => ({
          slug: row.area_slug,
          intention: row.intention,
          checkIns: row.check_ins,
          updatedAt: row.updated_at,
        })),
      });
    } catch (error) {
      console.error('Could not load life area updates:', error.message);
      return response.status(503).json({ error: 'Your life areas could not be loaded right now.' });
    }
  });

  router.get('/:slug/journal', async (request, response) => {
    const { slug } = request.params;
    if (!validAreas.has(slug)) return response.status(404).json({ error: 'That life area was not found.' });
    try {
      const result = await pool.query(
        "SELECT entry_id, TO_CHAR(entry_date, 'YYYY-MM-DD') AS date, body, created_at, updated_at " +
          'FROM life_area_journal_entries WHERE user_id = $1 AND area_slug = $2 ' +
          'ORDER BY updated_at DESC, entry_id DESC LIMIT 50',
        [request.user.id, slug],
      );
      return response.json({ entries: result.rows.map((row) => ({ id: String(row.entry_id), date: row.date, text: row.body, createdAt: row.created_at, updatedAt: row.updated_at })) });
    } catch (error) {
      console.error('Could not load a life area journal:', error.message);
      return response.status(503).json({ error: 'Your notes could not be loaded right now.' });
    }
  });

  router.post('/:slug/journal', async (request, response) => {
    const { slug } = request.params;
    const text = typeof request.body?.text === 'string' ? request.body.text : null;
    const date = isDateString(request.body?.date) ? request.body.date : new Date().toISOString().slice(0, 10);
    const activityDate = isDateString(request.body?.activityDate) ? request.body.activityDate : date;
    if (!validAreas.has(slug)) return response.status(404).json({ error: 'That life area was not found.' });
    if (text === null || text.length > 10000 || !text.trim()) {
      return response.status(400).json({ error: 'Write something before saving. Notes can be up to 10,000 characters.' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        'INSERT INTO life_area_journal_entries (user_id, area_slug, entry_date, body) VALUES ($1, $2, $3, $4) ' +
          "RETURNING entry_id, TO_CHAR(entry_date, 'YYYY-MM-DD') AS date, body, created_at, updated_at",
        [request.user.id, slug, date, text],
      );
      await client.query(
        'INSERT INTO life_area_journal_activity (user_id, activity_date) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [request.user.id, activityDate],
      );
      await client.query('COMMIT');
      const row = result.rows[0];
      return response.status(201).json({ entry: { id: String(row.entry_id), date: row.date, text: row.body, createdAt: row.created_at, updatedAt: row.updated_at } });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Could not save a life area journal entry:', error.message);
      return response.status(503).json({ error: 'Your note could not be saved right now.' });
    } finally {
      client.release();
    }
  });

  router.put('/:slug/journal/:entryId', async (request, response) => {
    const { slug, entryId } = request.params;
    const text = typeof request.body?.text === 'string' ? request.body.text : null;
    const activityDate = isDateString(request.body?.activityDate) ? request.body.activityDate : new Date().toISOString().slice(0, 10);
    if (!validAreas.has(slug)) return response.status(404).json({ error: 'That life area was not found.' });
    if (!/^\d{1,19}$/.test(entryId) || text === null || text.length > 10000) {
      return response.status(400).json({ error: 'This note could not be updated. Notes can be up to 10,000 characters.' });
    }
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        if (!text.trim()) {
          await client.query('DELETE FROM life_area_journal_entries WHERE user_id = $1 AND area_slug = $2 AND entry_id = $3', [request.user.id, slug, entryId]);
          await client.query('COMMIT');
          return response.status(204).end();
        }
        const result = await client.query(
          'UPDATE life_area_journal_entries SET body = $4, updated_at = NOW() WHERE user_id = $1 AND area_slug = $2 AND entry_id = $3 ' +
            "RETURNING entry_id, TO_CHAR(entry_date, 'YYYY-MM-DD') AS date, body, created_at, updated_at",
          [request.user.id, slug, entryId, text],
        );
        if (!result.rowCount) {
          await client.query('ROLLBACK');
          return response.status(404).json({ error: 'That note could not be found.' });
        }
        await client.query(
          'INSERT INTO life_area_journal_activity (user_id, activity_date) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [request.user.id, activityDate],
        );
        await client.query('COMMIT');
        const row = result.rows[0];
        return response.json({ entry: { id: String(row.entry_id), date: row.date, text: row.body, createdAt: row.created_at, updatedAt: row.updated_at } });
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Could not update a life area journal entry:', error.message);
      return response.status(503).json({ error: 'Your note could not be saved right now.' });
    }
  });

  router.delete('/:slug/journal/:entryId', async (request, response) => {
    const { slug, entryId } = request.params;
    if (!validAreas.has(slug)) return response.status(404).json({ error: 'That life area was not found.' });
    if (!/^\d{1,19}$/.test(entryId)) return response.status(400).json({ error: 'Choose a valid note.' });
    try {
      await pool.query(
        'DELETE FROM life_area_journal_entries WHERE user_id = $1 AND area_slug = $2 AND entry_id = $3',
        [request.user.id, slug, entryId],
      );
      return response.status(204).end();
    } catch (error) {
      console.error('Could not delete a life area journal entry:', error.message);
      return response.status(503).json({ error: 'Your note could not be deleted right now.' });
    }
  });

  router.put('/:slug', async (request, response) => {
    const { slug } = request.params;
    const intention = typeof request.body?.intention === 'string' ? request.body.intention.trim() : '';

    if (!validAreas.has(slug)) return response.status(404).json({ error: 'That life area was not found.' });
    if (intention.length > 240) {
      return response.status(400).json({ error: 'Keep your intention to 240 characters or fewer.' });
    }

    try {
      const result = await pool.query(
        'INSERT INTO life_area_updates (user_id, area_slug, intention) VALUES ($1, $2, $3) ' +
          'ON CONFLICT (user_id, area_slug) DO UPDATE SET intention = EXCLUDED.intention, updated_at = NOW() ' +
          'RETURNING area_slug, intention, check_ins, updated_at',
        [request.user.id, slug, intention],
      );
      return response.json({ area: toPublicArea(result.rows[0]) });
    } catch (error) {
      console.error('Could not save a life area intention:', error.message);
      return response.status(503).json({ error: 'Your intention could not be saved right now.' });
    }
  });

  router.post('/:slug/check-ins', async (request, response) => {
    const { slug } = request.params;
    if (!validAreas.has(slug)) return response.status(404).json({ error: 'That life area was not found.' });

    const requestedDate = request.body?.occurredOn;
    const activityDate = isDateString(requestedDate) ? requestedDate : new Date().toISOString().slice(0, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        'INSERT INTO life_area_updates (user_id, area_slug, check_ins) VALUES ($1, $2, 1) ' +
          'ON CONFLICT (user_id, area_slug) DO UPDATE ' +
          'SET check_ins = life_area_updates.check_ins + 1, updated_at = NOW() ' +
          'RETURNING area_slug, intention, check_ins, updated_at',
        [request.user.id, slug],
      );
      await client.query(
        'INSERT INTO life_area_check_ins (user_id, area_slug, activity_date) VALUES ($1, $2, $3)',
        [request.user.id, slug, activityDate],
      );
      await client.query('COMMIT');
      return response.json({ area: toPublicArea(result.rows[0]) });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Could not save a life area check-in:', error.message);
      return response.status(503).json({ error: 'Your check-in could not be saved right now.' });
    } finally {
      client.release();
    }
  });

  return router;
}

function isDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function toPublicArea(row) {
  return {
    slug: row.area_slug,
    intention: row.intention,
    checkIns: row.check_ins,
    updatedAt: row.updated_at,
  };
}
