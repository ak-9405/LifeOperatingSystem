# Life OS

A responsive personal life dashboard built with React, Vite, Express, PostgreSQL, and Docker.

## Run the full app with Docker ##

1. Copy .env.example to .env if you want to change the default local settings.
2. Start the app with: docker compose up --build
3. Open [http://localhost:5173](http://localhost:5173).

The first startup downloads the free LibreTranslate image and language models. Docker keeps the models in a named volume, and later translations run locally without sending page content to a paid translation API.

PostgreSQL stores contact form submissions. The API runs on port 4000; PostgreSQL uses port 5432 inside Docker and host port 5433.

Create an account from the header to save tasks, notes, intentions, check-ins, and other personal updates to your own profile. Account data is stored in PostgreSQL. Passwords are stored as scrypt hashes, and sign-in sessions use HTTP-only cookies that remain valid for 14 days. Set COOKIE_SECURE=true when serving the API over HTTPS.

The Admin demo is disabled by default so visitors can create their own accounts. To enable it for an isolated local preview, set `LIFEOS_LOCAL_DEMO=true` in `.env`; keep it disabled for shared or public deployments.

## Fast local development (recommended)

Run the web app and API directly on your computer, and keep only PostgreSQL and LibreTranslate in Docker:

1. Run `npm install` once.
2. Start the supporting services with `docker compose up -d database translator`.
3. Run `npm run dev`.
4. Open [http://localhost:5173](http://localhost:5173).

Vite refreshes the browser as source files change and proxies `/api` requests to the Express server on port 4000. PostgreSQL is available on host port 5433 to avoid conflicts with a locally installed PostgreSQL server; the API container continues to use port 5432 on the Docker network.

## Translation setup

The app uses LibreTranslate with Argos Translate models through the local Docker service. No API key or paid account is required. The supported languages are Spanish, French, German, Italian, Portuguese, Japanese, Korean, and Chinese.

## Google sign-in and greeting emails

The email and password flow works without third-party credentials. Google sign-in needs OAuth credentials from Google Cloud and the redirect URL registered exactly as shown below. Add these values to your local `.env` file, then rebuild the API container:

    GOOGLE_CLIENT_ID=your-client-id
    GOOGLE_CLIENT_SECRET=your-client-secret
    GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
    APP_BASE_URL=http://localhost:5173

To send the warm greeting after account creation and sign-in, also configure a working SMTP URL and sender address:

    SMTP_URL=smtps://username:password@smtp.example.com:465
    EMAIL_FROM=Life OS <hello@example.com>

Without SMTP configured, sign-in still succeeds and the app displays that greeting email delivery is not configured. The local Admin demo account never receives email. For local demonstrations, use `admin@lifeos.local` with password `1234`; keep `LIFEOS_LOCAL_DEMO` disabled in production.

## Life OS Plus billing

The local Admin demo account has Plus features unlocked for preview. Real accounts require Stripe billing configuration before checkout is available. Create recurring Stripe prices of £3.99/month and £29.99/year, then add their Price IDs and the Stripe secret key to `.env` using the `STRIPE_*` settings in `.env.example`. Configure a Stripe webhook pointing to `/api/billing/webhook` and subscribe it to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`. Use the webhook signing secret for `STRIPE_WEBHOOK_SECRET`.

Stripe Checkout hosts the payment form; Life OS stores the Stripe customer and subscription references and subscription status, not card details. Keep the journaling, life areas, activity calendar, and basic progress available on the free plan. The complete motivation card bank, guided journal templates, and personal activity reflections are Plus features.

## Workspace pages and philosophy library

The main navigation opens separate routes, including /progress, /life-areas, /life-areas/:slug, /prompts, /philosophy, /contact and /account. The old /notes address redirects to /contact. Vite supports direct loading of these URLs; a production static host must also route frontend URLs to index.html while keeping /api requests on the server.

The desktop sidebar can be hidden and reopened from the header. Its preference is stored in this browser; the mobile menu uses its own responsive layout.

At API startup, server/quotes.js creates the philosophy_quotes table and upserts the 100 records in server/data/philosophy-quotes.json. Restarting preserves the same quote IDs. GET /api/quotes requires a signed-in session. The Philosophy page cycles through the library and remembers the last position in this browser for each account.

The quotes are excerpts from historical translations of Meditations (George Long), Enchiridion (Thomas Wentworth Higginson), Analects and Tao Teh King (James Legge), and Plato's Apology (Benjamin Jowett). Socrates is identified as portrayed by Plato. Every record includes its work, translator, and a link to the source edition.
