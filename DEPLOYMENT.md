# Deployment checklist

## MongoDB Atlas

1. Create a database named `civicconnect`.
2. Create a least-privilege database user.
3. Add the Render outbound network access rule required by your Atlas plan.
4. Copy the connection string into Render as `MONGO_URI`.

## Render

Set:

```text
Build command: npm install --prefix server
Start command: npm start --prefix server
CLIENT_ORIGIN=https://<your-vercel-domain>
JWT_SECRET=<long-random-secret>
ADMIN_PASSWORD=<new-admin-password>
```

Verify `https://<render-domain>/api/health` returns `ok: true` and `database: connected`.

## Vercel

Set:

```text
VITE_API_URL=https://<your-render-domain>/api
```

The included `vercel.json` rewrites deep links to the React SPA entry point.
