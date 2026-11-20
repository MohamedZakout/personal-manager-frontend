# Relay — Project Operations

A Next.js frontend for the NestJS API in `../backend`. It covers projects, provider accounts, saved command runbooks, encrypted credentials, attachments, categories, user management, and profile settings.

## Run locally

1. Start the API (it listens on port 3001 by default):

   ```bash
   cd ../backend
   npm run start:dev
   ```

2. Start the frontend:

   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:3000.

The seeded admin account is `mohamed.zakout@outlook.com` with password `2102`. Change it after signing in if this is shared.

## Configuration

Create `.env.local` if it does not exist:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

The backend must allow the frontend origin through `CORS_ORIGINS` (already set to `http://localhost:3000,http://localhost:5173` in the shipped `.env.example`).

## How it works

- `lib/api.ts` is the typed API client. It unwraps the backend's `{ data: ... }` envelope, sends the bearer token from local storage, and exposes one small object per resource.
- `components/providers/app-providers.tsx` owns the auth session and toast queue.
- `components/shell/app-shell.tsx` is the authenticated layout.
- `components/managers/*` hold the reusable CRUD panels for credentials, runbooks, and files on project and account detail pages.
- All protected screens guard on the client and use `/api/me` on load to validate a stored token.

## Checks

```bash
npm run lint
npm run build
```
