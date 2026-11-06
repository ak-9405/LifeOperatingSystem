import express from 'express';
import Stripe from 'stripe';

let stripeClient;

function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

export async function ensureBillingSchema(pool) {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS lifeos_billing_customers (' +
      'user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, ' +
      'stripe_customer_id TEXT NOT NULL UNIQUE, ' +
      'created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()' +
    ');' +
    'CREATE TABLE IF NOT EXISTS lifeos_subscriptions (' +
      'user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, ' +
      'stripe_subscription_id TEXT NOT NULL UNIQUE, stripe_customer_id TEXT NOT NULL, ' +
      'price_id TEXT NOT NULL DEFAULT \'\', status VARCHAR(32) NOT NULL, ' +
      'current_period_end TIMESTAMPTZ, cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE, ' +
      'updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()' +
    ');' +
    'CREATE INDEX IF NOT EXISTS lifeos_subscriptions_customer_idx ON lifeos_subscriptions (stripe_customer_id);' +
    'CREATE TABLE IF NOT EXISTS stripe_webhook_events (' +
      'event_id TEXT PRIMARY KEY, processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()' +
    ');',
  );
}

export function createRequirePlus(pool) {
  return async (request, response, next) => {
    if (request.user?.demo) {
      request.user.isPlus = true;
      return next();
    }
    try {
      const result = await pool.query(
        "SELECT status FROM lifeos_subscriptions WHERE user_id = $1 AND status IN ('active', 'trialing')",
        [request.user.id],
      );
      if (result.rowCount) {
        request.user.isPlus = true;
        return next();
      }
      return response.status(403).json({ error: 'This is a Life OS Plus feature.', plusRequired: true });
    } catch (error) {
      console.error('Could not verify the Life OS Plus subscription:', error.message);
      return response.status(503).json({ error: 'Your plan could not be checked right now.' });
    }
  };
}

export async function cancelStripeSubscriptionForAccountDeletion(pool, userId) {
  const result = await pool.query(
    "SELECT stripe_subscription_id FROM lifeos_subscriptions WHERE user_id = $1 AND status IN ('active', 'trialing', 'past_due')",
    [userId],
  );
  const subscriptionId = result.rows[0]?.stripe_subscription_id;
  if (!subscriptionId) return;
  const client = stripe();
  if (!client) throw new Error('Stripe billing is unavailable, so the subscription could not be cancelled.');
  await client.subscriptions.cancel(subscriptionId);
}

export function createBillingRouter(pool, requireAuth) {
  const router = express.Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth);

  router.get('/status', async (request, response) => {
    if (request.user.demo) {
      return response.json({ isPlus: true, demo: true, status: 'demo', cancelAtPeriodEnd: false, currentPeriodEnd: null, checkoutEnabled: false });
    }
    try {
      const result = await pool.query(
        'SELECT status, current_period_end, cancel_at_period_end FROM lifeos_subscriptions WHERE user_id = $1',
        [request.user.id],
      );
      const subscription = result.rows[0];
      return response.json({
        isPlus: Boolean(subscription && ['active', 'trialing'].includes(subscription.status)),
        demo: false,
        status: subscription?.status || 'free',
        cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
        currentPeriodEnd: subscription?.current_period_end || null,
        checkoutEnabled: Boolean(stripe() && process.env.STRIPE_PRICE_MONTHLY_ID && process.env.STRIPE_PRICE_YEARLY_ID),
      });
    } catch (error) {
      console.error('Could not load the subscription status:', error.message);
      return response.status(503).json({ error: 'Your plan could not be loaded right now.' });
    }
  });

  router.post('/checkout', async (request, response) => {
    const plan = request.body?.plan;
    if (!['monthly', 'yearly'].includes(plan)) return response.status(400).json({ error: 'Choose a valid Plus plan.' });
    const client = stripe();
    const priceId = plan === 'monthly' ? process.env.STRIPE_PRICE_MONTHLY_ID : process.env.STRIPE_PRICE_YEARLY_ID;
    if (!client || !priceId) return response.status(503).json({ error: 'Plus checkout is in preview until Stripe billing is connected.' });
    if (request.user.demo) return response.status(409).json({ error: 'The Admin demo already has Plus access.' });

    try {
      const currentPlan = await pool.query(
        "SELECT status FROM lifeos_subscriptions WHERE user_id = $1 AND status IN ('active', 'trialing', 'past_due')",
        [request.user.id],
      );
      if (currentPlan.rowCount) return response.status(409).json({ error: 'Your account already has a subscription. Manage it from Life OS Plus.' });
      const existing = await pool.query('SELECT stripe_customer_id FROM lifeos_billing_customers WHERE user_id = $1', [request.user.id]);
      let customerId = existing.rows[0]?.stripe_customer_id;
      if (!customerId) {
        const customer = await client.customers.create({
          email: request.user.email,
          name: request.user.name,
          metadata: { lifeos_user_id: String(request.user.id) },
        });
        customerId = customer.id;
        await pool.query(
          'INSERT INTO lifeos_billing_customers (user_id, stripe_customer_id) VALUES ($1, $2) ' +
            'ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id, updated_at = NOW()',
          [request.user.id, customerId],
        );
      }
      const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
      const session = await client.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        client_reference_id: String(request.user.id),
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        metadata: { lifeos_user_id: String(request.user.id) },
        subscription_data: { metadata: { lifeos_user_id: String(request.user.id) } },
        success_url: baseUrl + '/plus?billing=success',
        cancel_url: baseUrl + '/plus?billing=cancelled',
      });
      return response.json({ url: session.url });
    } catch (error) {
      console.error('Could not start Plus checkout:', error.message);
      return response.status(503).json({ error: 'Plus checkout could not be started right now.' });
    }
  });

  router.post('/portal', async (request, response) => {
    const client = stripe();
    if (!client) return response.status(503).json({ error: 'Subscription management is not connected yet.' });
    try {
      const result = await pool.query('SELECT stripe_customer_id FROM lifeos_billing_customers WHERE user_id = $1', [request.user.id]);
      const customerId = result.rows[0]?.stripe_customer_id;
      if (!customerId) return response.status(404).json({ error: 'No subscription is connected to this account yet.' });
      const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
      const session = await client.billingPortal.sessions.create({ customer: customerId, return_url: baseUrl + '/plus' });
      return response.json({ url: session.url });
    } catch (error) {
      console.error('Could not open subscription management:', error.message);
      return response.status(503).json({ error: 'Subscription management could not be opened right now.' });
    }
  });

  return router;
}

export function handleStripeWebhook(pool) {
  return async (request, response) => {
    const client = stripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!client || !webhookSecret) return response.status(503).send('Stripe webhook is not configured.');
    let event;
    try {
      event = client.webhooks.constructEvent(request.body, request.headers['stripe-signature'], webhookSecret);
    } catch {
      return response.status(400).send('Invalid Stripe signature.');
    }

    try {
      let subscription = null;
      if (event.type === 'checkout.session.completed') {
        const checkout = event.data.object;
        if (checkout.mode === 'subscription' && checkout.subscription) {
          subscription = await client.subscriptions.retrieve(typeof checkout.subscription === 'string' ? checkout.subscription : checkout.subscription.id);
        }
      } else if (event.type.startsWith('customer.subscription.')) {
        subscription = event.data.object;
      } else if (event.type === 'invoice.payment_failed' || event.type === 'invoice.paid') {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (subscriptionId) subscription = await client.subscriptions.retrieve(typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id);
      }

      const databaseClient = await pool.connect();
      try {
        await databaseClient.query('BEGIN');
        const accepted = await databaseClient.query('INSERT INTO stripe_webhook_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING event_id', [event.id]);
        if (!accepted.rowCount) {
          await databaseClient.query('COMMIT');
          return response.json({ received: true, duplicate: true });
        }
        if (subscription) await saveSubscription(databaseClient, subscription);
        await databaseClient.query('COMMIT');
        return response.json({ received: true });
      } catch (error) {
        await databaseClient.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        databaseClient.release();
      }
    } catch (error) {
      console.error('Could not process a Stripe webhook:', error.message);
      return response.status(500).send('Webhook processing failed.');
    }
  };
}

async function saveSubscription(databaseClient, subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const userId = subscription.metadata?.lifeos_user_id ||
    (await databaseClient.query('SELECT user_id FROM lifeos_billing_customers WHERE stripe_customer_id = $1', [customerId])).rows[0]?.user_id;
  if (!userId || !customerId) return;
  const priceId = subscription.items?.data?.[0]?.price?.id || '';
  const periodEnd = subscription.items?.data?.[0]?.current_period_end || subscription.current_period_end || null;
  await databaseClient.query(
    'INSERT INTO lifeos_subscriptions (user_id, stripe_subscription_id, stripe_customer_id, price_id, status, current_period_end, cancel_at_period_end) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7) ' +
      'ON CONFLICT (user_id) DO UPDATE SET stripe_subscription_id = EXCLUDED.stripe_subscription_id, ' +
      'stripe_customer_id = EXCLUDED.stripe_customer_id, price_id = EXCLUDED.price_id, status = EXCLUDED.status, ' +
      'current_period_end = EXCLUDED.current_period_end, cancel_at_period_end = EXCLUDED.cancel_at_period_end, updated_at = NOW()',
    [userId, subscription.id, customerId, priceId, subscription.status, periodEnd ? new Date(periodEnd * 1000) : null, subscription.cancel_at_period_end === true],
  );
}
