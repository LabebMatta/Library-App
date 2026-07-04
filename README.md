# Library Status Tracker

A lightweight Express application that displays whether a library is open or closed and records who changed its status. State is stored locally in `data.json`.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Deployment

The app uses the `PORT` environment variable provided by hosts such as Render or Replit. Use `npm install` as the build command and `npm start` as the start command.

> Note: some free hosting platforms use an ephemeral filesystem. On those services, `data.json` can be reset when the instance is redeployed unless a persistent disk is attached.
