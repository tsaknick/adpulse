# AdPulse Render Deploy

This folder is a deploy-ready copy of the dashboard for Render.

## Render settings

- Service type: Web Service
- Runtime: Node
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Instance type: Free is fine for testing

Render provides the public HTTPS URL, for example `https://adpulse-dashboard.onrender.com`.

## Environment variables

Set these in the Render service Environment tab:

- `META_APP_ID`
- `META_APP_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID` if your Google Ads access needs a manager login customer ID

Do not commit `.env.local` or `.adpulse-data`.

## Meta redirect URI

After Render deploys, add this exact URL in Meta Developers:

`https://YOUR-RENDER-SERVICE.onrender.com/api/auth/meta_ads/callback`

Replace `YOUR-RENDER-SERVICE` with the hostname Render gives you.

## Important storage note

Render Free web services use an ephemeral filesystem. OAuth tokens and search-term tags stored in `.adpulse-data/integrations.json` can disappear after redeploys, restarts, or spin-downs.

This is OK for testing OAuth over HTTPS. For production, move the store to a database such as Render Postgres.
