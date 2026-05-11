# Client Factory

Date: 2026-05-11

The goal is to make each restaurant feel custom while keeping loyalty, auth, push, rewards, RLS, and dashboard behavior shared.

## Source Of Truth

Every restaurant starts with one config file:

```txt
clients/<slug>/client.config.json
```

This file owns:

- native identity: Expo slug, app scheme, iOS bundle identifier, EAS project id
- brand: display name, in-app brand text, brand mark
- theme tokens: colors, spacing, radii, brand/category typography
- menu categories and icons
- tab names and icons
- loyalty threshold and reward copy
- admin defaults: title, base path, default push screen

The mobile app reads the same config through `src/config/client.ts`, `src/config/tenant.ts`, and `src/ui/theme.ts`.
`app.config.js` reads it for Expo/EAS, so the app name, scheme, bundle id, splash color, icons, and EAS project id stay aligned.

## New Client Flow

1. Create config:

```bash
npm run client:new -- mozzi "Mozzi" com.greenvoi.mozzi mozzi
```

2. Confirm the generated import and registry entry in `src/config/client.ts`.

3. Replace or point asset paths in `clients/mozzi/client.config.json`.

4. Apply visual direction in the config first:

```txt
theme.colors
theme.radii
theme.typography
menuCategories
loyalty.copy
```

5. Only then customize screen layouts/components. Auth, Supabase calls, points, rewards, push registration, and RLS assumptions should stay shared unless a client has a real product requirement.

6. Validate:

```bash
APP_CLIENT=mozzi npm run client:validate -- mozzi
APP_CLIENT=mozzi npx expo config --json
npm run typecheck
```

For a newly generated client, keep `native.easProjectId` empty until that client has its own EAS project. The Expo config will then expose `extra.eas` without a project id, which is safer than accidentally building against the MNC/Laura EAS project.

Check full launch readiness:

```bash
npm run client:launch-check -- mozzi --full
```

Use the lower-level readiness check when you only need the structural report:

```bash
npm run client:readiness -- mozzi
```

Generate the initial Supabase seed SQL:

```bash
npm run client:seed-sql -- mozzi
```

7. Configure Supabase for the client:

- fresh Supabase project
- apply all migrations
- deploy Edge Functions
- set function secrets
- configure Auth redirect URLs and Google/Apple providers
- create first admin and set `profiles.role = 'admin'`

8. Configure dashboard for the same client and Supabase project:

```bash
cd /Users/marcin/mnc-admin
npm run client:new -- mozzi "MOZZI ADMIN" /mozzi-admin/
VITE_CLIENT_SLUG=mozzi npm run client:validate -- mozzi
VITE_CLIENT_SLUG=mozzi npm run build
```

9. Run smoke tests from `docs/clone-runbook.md`.

10. Build:

```bash
APP_CLIENT=mozzi EXPO_PUBLIC_CLIENT_SLUG=mozzi eas build -p ios --profile production
```

## Design Rule

Client customization should be meaningful, not just recoloring. A clone can change:

- header composition
- category bar style
- tab treatment
- loyalty card layout
- icon set
- radius system
- typography feel
- menu grouping presentation
- reward copy and visual emphasis

It should not change the core contract casually:

- `menu_items.category` must match configured category keys
- reward threshold must match dashboard/RPC behavior before production
- auth redirects must match `native.scheme`
- dashboard must point to the matching Supabase project
- push functions must be deployed for that project

## When To Fork Code

Do not fork the core app for ordinary visual customization.

Fork or branch only when a restaurant needs a real product difference, for example:

- five tabs instead of two
- ordering/reservations
- stamps instead of points
- multiple locations
- separate staff permission model
- paid integration with POS

Even then, add the capability behind config where possible so the next client can reuse it.
