# Codex Operating Notes

This repository is the mobile app template for a restaurant/cafe loyalty product. The admin dashboard lives next to it at:

```txt
/Users/marcin/mnc-admin
```

The business goal is not one app only. The goal is a repeatable client factory: create separate branded mobile apps and separate owner dashboards for restaurants, while keeping the loyalty/auth/push/reward core shared and stable.

## Current Strategy

Use one isolated Supabase project per restaurant during the early commercial phase.

Do not convert this to a shared multi-tenant Supabase unless the owner explicitly asks for that architectural migration. Separate Supabase projects are simpler, safer, and easier to debug for the first 10-20 clients.

Use one mobile client config and one dashboard client config per restaurant:

```txt
concept-app/clients/<slug>/client.config.json
concept-app/clients/<slug>/seed.json
mnc-admin/clients/<slug>/dashboard.config.json
```

`mozzi` is a demo/test fixture, not a real customer.

## Start Here

For new client work, read:

```txt
docs/client-launch-runbook.md
docs/client-factory.md
docs/clone-runbook.md
```

Then run the launch checker:

```bash
npm run client:launch-check -- <slug> --full
```

For the demo client:

```bash
npm run client:launch-check -- mozzi --full
```

## What To Preserve

Keep these core behaviors shared unless there is a real product requirement:

- Supabase auth/session handling
- profile creation and role model
- loyalty points and reward redemption
- push token registration
- push open tracking
- dashboard role checks
- RLS/security assumptions
- Edge Function contracts

Visual customization should go through client config and theme first. Only change screen/component layout when the client needs a genuinely different experience.

## New Client Flow

1. Gather the client brief: name, slug, owner email, bundle id, design direction, categories, reward, languages, Google/Apple requirements.
2. Create/update mobile config.
3. Create/update dashboard config in `/Users/marcin/mnc-admin`.
4. Add or update `clients/<slug>/seed.json`.
5. Run `npm run client:launch-check -- <slug> --full`.
6. Provision isolated Supabase.
7. Apply migrations, deploy Edge Functions, set secrets.
8. Apply seed SQL with `npm run client:seed-sql -- <slug>`.
9. Create first admin and set their role.
10. Configure Google/Apple/EAS/App Store/Vercel.
11. Run physical-device smoke tests before TestFlight.

## Dashboard Hosting Direction

Prefer Vercel with one isolated dashboard deployment/project per client. A practical domain model is:

```txt
mnc.appkadokawy.pl
mozzi.appkadokawy.pl
<slug>.appkadokawy.pl
```

Each deployment should have its own environment variables:

```txt
VITE_CLIENT_SLUG=<slug>
VITE_SUPABASE_URL=<client Supabase URL>
VITE_SUPABASE_ANON_KEY=<client Supabase anon key>
```

## Important Commands

```bash
npm run client:new -- <slug> "Display Name" com.greenvoi.<slug> <scheme>
npm run client:validate -- <slug>
npm run client:readiness -- <slug>
npm run client:launch-check -- <slug> --full
npm run client:seed-sql -- <slug>
APP_CLIENT=<slug> EXPO_PUBLIC_CLIENT_SLUG=<slug> npx expo config --json
APP_CLIENT=<slug> EXPO_PUBLIC_CLIENT_SLUG=<slug> npx expo start --clear
```

Dashboard commands:

```bash
cd /Users/marcin/mnc-admin
npm run client:new -- <slug> "<NAME> ADMIN" /<slug>-admin/
VITE_CLIENT_SLUG=<slug> npm run client:validate -- <slug>
VITE_CLIENT_SLUG=<slug> npm run build
VITE_CLIENT_SLUG=<slug> npm run dev
```
