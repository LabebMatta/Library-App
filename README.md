# Library Status Tracker

A lightweight Express application backed by a Supabase PostgreSQL database. The database keeps the current status and activity history across Render restarts and redeployments.

## 1. Create the Supabase tables

1. Create or open a project at [Supabase](https://supabase.com/dashboard).
2. Open **SQL Editor** and choose **New query**.
3. Copy all of `supabase-schema.sql` into the editor and click **Run**.

The script creates:

- `library_status`: one row containing the current open/closed state.
- `activity_log`: the history of usernames, actions, and timestamps.

It also enables Row Level Security without public policies. The tables are therefore unavailable through public Supabase API keys; only the trusted backend database connection can use them.

## 2. Get the database URL

In the Supabase project, click **Connect**, select **Session pooler**, and copy its URI. It should resemble:

```text
postgresql://postgres.PROJECT_REF:[YOUR-PASSWORD]@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require
```

Replace `[YOUR-PASSWORD]` with the database password. If typing it manually, URL-encode special characters in the password. Copying the completed URI from Supabase is less error-prone.

The Session pooler is appropriate for a persistent Render web service and supports IPv4. Do not expose this value in frontend code or commit it to Git.

## 3. Configure Render

In the Render service, open **Environment** and add:

```text
Key:   DATABASE_URL
Value: postgresql://postgres.PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require
```

Use these service commands:

```text
Build Command: npm install
Start Command: npm start
```

Render supplies `PORT` automatically; do not create a custom `PORT` variable there. Save the environment variable and redeploy the latest commit.

## Run locally

Requires Node.js 18 or newer.

1. Copy `.env.example` to `.env` and insert the real Supabase URI.
2. Install and start the app:

```bash
npm install
npm start
```

Open `http://localhost:3000`.

The old `data.json` file is no longer read or written by the application.

## NFC open link

The app includes an idempotent NFC endpoint that opens the library but never
closes it on a repeated scan. It records an `opened` activity only when the
state actually changes from closed to open.

Add a long random value named `NFC_TOKEN` to the Render environment. Then use
this URL on the NFC tag, replacing the hostname and token:

```text
https://YOUR-RENDER-SERVICE.onrender.com/api/nfc-open?name=Labeb&token=YOUR_NFC_TOKEN
```

Opening the URL updates Supabase and redirects to the library page. For a JSON
response while testing, append `&format=json`.

Treat the tag as a physical key: anyone who reads or copies its URL can trigger
the endpoint. If it is lost, replace `NFC_TOKEN` in Render and rewrite the tag.
