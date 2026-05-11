# Client Launch Runbook

Date: 2026-05-11

This is the practical launch flow for turning a configured client, such as `mozzi`, into a separate TestFlight app with its own Supabase project and dashboard.

## Goal

The target operating model is:

```txt
one shared codebase
one mobile client config per restaurant
one dashboard client config per restaurant
one isolated Supabase project per restaurant
one EAS/App Store app per restaurant
```

## What Codex Can Do

Codex can usually handle:

- create/update mobile client config
- create/update dashboard client config
- validate mobile/dashboard category alignment
- generate seed SQL for menu and app config
- run typecheck, Expo config checks, dashboard build, dashboard lint
- deploy Supabase migrations/functions when the target project is available through tools or CLI
- inspect RLS, tables, Edge Function logs, and advisors when connected to the project
- prepare exact commands and manual checklists for Apple, Google, EAS, and Supabase Auth

## What The Owner Must Still Do

The owner usually still needs to:

- create or connect the new Supabase project
- provide project URL, anon key, and service role key through a safe channel
- create the EAS project and App Store Connect app
- configure Apple Developer capabilities
- configure Google OAuth credentials if Google login is enabled
- provide final brand assets and legal/store metadata

## Dry-Run Commands

Run from `concept-app`:

```bash
npm run client:validate -- mozzi
npm run client:readiness -- mozzi
npm run client:seed-sql -- mozzi
APP_CLIENT=mozzi EXPO_PUBLIC_CLIENT_SLUG=mozzi npx expo config --json
npm run typecheck
```

Run from `mnc-admin`:

```bash
VITE_CLIENT_SLUG=mozzi npm run client:validate -- mozzi
VITE_CLIENT_SLUG=mozzi npm run build
npm run lint
```

## Production Provisioning

1. Create a fresh Supabase project for the client.

2. Apply all migrations from `supabase/migrations`.

3. Deploy these Edge Functions:

```txt
delete_user
register_push_token
track_push_open
send_push
run_scheduled_push
dashboard_stats
```

4. Set Edge Function secrets:

```txt
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
```

5. Apply seed SQL:

```bash
npm run client:seed-sql -- mozzi
```

Apply the generated SQL only to the client's isolated Supabase project.

6. Create the first admin account, then run:

```sql
update public.profiles
set role = 'admin'
where email = 'owner@example.com';
```

7. Configure Supabase Auth:

- app URL / redirect allowlist for the client scheme
- Google provider credentials
- Apple provider credentials
- email settings if needed

8. Configure scheduled push runner:

- use Supabase `pg_cron`, or
- keep a manual/external scheduler that calls `run_scheduled_push` with `x-cron-secret`

9. Run security checks:

- RLS enabled on public tables
- app roles cannot write `app_config`, `push_tokens`, `push_opens`, or `loyalty_events` directly
- normal user cannot access dashboard data
- staff can adjust points and redeem rewards
- admin can manage users/staff

## EAS And TestFlight

1. Create a separate EAS project for the client.

2. Put the project id into:

```txt
clients/<slug>/client.config.json -> native.easProjectId
```

3. Configure EAS env:

```txt
APP_CLIENT=<slug>
EXPO_PUBLIC_CLIENT_SLUG=<slug>
EXPO_PUBLIC_SUPABASE_URL=<client Supabase URL>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<client anon key>
```

4. Create App Store Connect app with the client's bundle id.

5. Enable:

- Push Notifications
- Sign in with Apple

6. Build:

```bash
APP_CLIENT=<slug> EXPO_PUBLIC_CLIENT_SLUG=<slug> eas build -p ios --profile production
```

## Dashboard Deployment

Each early client should get an isolated dashboard deployment/env.

Required env:

```txt
VITE_CLIENT_SLUG=<slug>
VITE_SUPABASE_URL=<client Supabase URL>
VITE_SUPABASE_ANON_KEY=<client anon key>
VITE_ADMIN_BASE_PATH=<optional path override>
```

Build:

```bash
VITE_CLIENT_SLUG=<slug> npm run build
```

## Launch Gate

Do not send to a restaurant owner until all of these are true:

- `npm run client:readiness -- <slug>` has no `FAIL`
- all `TODO` items are intentionally resolved or accepted
- mobile app boots on a physical iPhone
- email login works
- Google login works if enabled
- Apple login works if enabled
- push permission and token registration work
- immediate push reaches device
- menu loads with client categories
- points code opens
- staff can add/remove points
- staff can redeem reward
- dashboard stats load
- normal user cannot access dashboard
