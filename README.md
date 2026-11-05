# Life OS

A responsive personal life dashboard built with React, Vite, Express, PostgreSQL, and Docker.

## Run the full app with Docker ##

1. Copy .env.example to .env if you want to change the default local settings.
2. Start the app with: docker compose up --build
3. Open [http://localhost:5173](http://localhost:5173).

The first startup downloads the free LibreTranslate image and language models. Docker keeps the models in a named volume, and later translations run locally without sending page content to a paid translation API.

PostgreSQL stores contact form submissions. The API runs on port 4000 and the database on port 5432.

Create an account from the header to save area intentions and check-ins to your own profile. Passwords are stored as scrypt hashes, and sign-in sessions use HTTP-only cookies. Set COOKIE_SECURE=true when serving the API over HTTPS.

## Run the web app locally

Start PostgreSQL with docker compose up -d database, then run npm install and npm run dev.

When running locally, Vite uses its default available port and proxies /api requests to the Express server on port 4000. Start the database and local translator first with docker compose up -d database translator.

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

Without SMTP configured, sign-in still succeeds and the app displays that greeting email delivery is not configured. The local Admin demo account never receives email.

## Workspace pages and philosophy library

The main navigation opens separate routes, including /progress, /life-areas, /life-areas/:slug, /prompts, /philosophy, /contact and /account. The old /notes address redirects to /contact. Vite supports direct loading of these URLs; a production static host must also route frontend URLs to index.html while keeping /api requests on the server.

The desktop sidebar can be hidden and reopened from the header. Its preference is stored in this browser; the mobile menu uses its own responsive layout.

At API startup, server/quotes.js creates the philosophy_quotes table and upserts the 100 records in server/data/philosophy-quotes.json. Restarting preserves the same quote IDs. GET /api/quotes requires a signed-in session. The Philosophy page cycles through the library and remembers the last position in this browser for each account.

The quotes are excerpts from historical translations of Meditations (George Long), Enchiridion (Thomas Wentworth Higginson), Analects and Tao Teh King (James Legge), and Plato's Apology (Benjamin Jowett). Socrates is identified as portrayed by Plato. Every record includes its work, translator, and a link to the source edition.
