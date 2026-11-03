# Life OS

A responsive personal life dashboard built with React, Vite, Express, PostgreSQL, and Docker.

## Run the full app with Docker

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
