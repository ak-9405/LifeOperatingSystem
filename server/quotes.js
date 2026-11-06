import express from 'express';
import { readFileSync } from 'node:fs';

const seedQuotes = JSON.parse(readFileSync(new URL('./data/philosophy-quotes.json', import.meta.url), 'utf8'));

export async function ensureQuoteSchema(pool) {
  if (seedQuotes.length !== 100 || new Set(seedQuotes.map((quote) => quote.id)).size !== 100) throw new Error('The philosophy library must contain 100 distinct quotes.');
  await pool.query(
    'CREATE TABLE IF NOT EXISTS philosophy_quotes (' +
    'id VARCHAR(32) PRIMARY KEY, quote_text TEXT NOT NULL, author VARCHAR(80) NOT NULL, ' +
    'work VARCHAR(200) NOT NULL, translator VARCHAR(100) NOT NULL, source_url TEXT NOT NULL, ' +
    'display_order INTEGER NOT NULL CHECK (display_order > 0))'
  );
  await pool.query(
    'INSERT INTO philosophy_quotes (id, quote_text, author, work, translator, source_url, display_order) ' +
    'SELECT id, text, author, work, translator, source_url, display_order FROM jsonb_to_recordset($1::jsonb) ' +
    'AS q(id text, text text, author text, work text, translator text, source_url text, display_order integer) ' +
    'ON CONFLICT (id) DO UPDATE SET quote_text = EXCLUDED.quote_text, author = EXCLUDED.author, ' +
    'work = EXCLUDED.work, translator = EXCLUDED.translator, source_url = EXCLUDED.source_url, display_order = EXCLUDED.display_order',
    [JSON.stringify(seedQuotes)],
  );
}

export function createQuoteRouter(pool, requireAuth, requirePlus) {
  const router = express.Router();
  router.use(requireAuth);
  router.get('/daily', async (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    try {
      const dayIndex = Math.floor(Date.now() / 86400000) % seedQuotes.length;
      const result = await pool.query(
        'SELECT id, quote_text AS text, author, work, translator, source_url AS "sourceUrl" FROM philosophy_quotes ORDER BY display_order, id LIMIT 1 OFFSET $1',
        [dayIndex],
      );
      return response.json({ quote: result.rows[0] || null });
    } catch (error) {
      console.error('Could not load the daily motivation card:', error.message);
      return response.status(503).json({ error: 'Today’s motivation card could not be loaded. Please try again.' });
    }
  });
  router.get('/', requirePlus, async (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    try {
      const result = await pool.query('SELECT id, quote_text AS text, author, work, translator, source_url AS "sourceUrl" FROM philosophy_quotes ORDER BY display_order, id');
      return response.json({ quotes: result.rows, count: result.rowCount });
    } catch (error) {
      console.error('Could not load the philosophy library:', error.message);
      return response.status(503).json({ error: 'The quote library could not be loaded. Please try again.' });
    }
  });
  return router;
}
