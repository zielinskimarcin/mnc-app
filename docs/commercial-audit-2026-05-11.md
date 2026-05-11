# Commercial Audit - Template v1

Date: 2026-05-11

## Verdict

The Laura/MNC app is strong enough for continued TestFlight testing and a controlled first commercial pilot.
It is not yet a fully repeatable multi-client template. The main blockers are not basic stability; they are
operational repeatability, OAuth provider verification, and deeper loyalty analytics.

## Verified

- Mobile app boots with Supabase env guard instead of a white screen.
- Expo Doctor passes 17/17 checks.
- TypeScript passes for the mobile app.
- Admin dashboard build and lint pass.
- Admin production dependencies have no npm audit findings.
- Mobile npm audit is reduced to one remaining moderate Expo/Metro/PostCSS advisory chain that should not be fixed with `--force`.
- Push token writes and push open writes are closed to direct app roles and routed through Edge Functions.
- Live push token exists for the real iPhone test device and is linked to a user.
- Scheduled push runner is active in Supabase `pg_cron`.
- `admin_users` legacy Edge Function is disabled in live Supabase and both admin repo copies now match that disabled behavior.
- Public writes to `app_config`, `push_tokens`, and `push_opens` are closed.
- Account deletion exists in the app profile screen.
- Mobile/admin tenant config now centralizes brand/menu/loyalty/dashboard settings.
- `loyalty_events` now records staff point adjustments with RLS-protected audit history.
- Mobile app has a persisted PL/EN language switch in the profile screen.
- Reward redemption is explicit: the app shows `ODBIERZ NAGRODĘ` / `REDEEM REWARD` at 10 points, while staff redeems it in the dashboard and subtracts 10 points.

## Fixed During This Audit

- Aligned local migration filenames with live Supabase migration versions.
- Updated Expo SDK 54 patch dependencies to versions expected by Expo Doctor.
- Converted `app.config.js` to the Expo-supported dynamic config shape.
- Changed admin GitHub cron workflow into a manual fallback and corrected the header to `x-cron-secret`.
- Added admin Supabase env guard to avoid a broken blank dashboard when env vars are missing.
- Disabled the stale root copy of `admin_users` in `mnc-admin/supabase/functions`.
- Added clone-oriented tenant config in mobile app and admin dashboard.
- Added `loyalty_events` database ledger and recent point operation history in the admin points screen.
- Added the first mobile PL/EN localization layer.
- Added staff reward redemption RPC and dashboard action.

## High Priority Before Cloning

1. Repeat OAuth verification per clone.
   MNC Google and Apple sign-in were verified on device after provider configuration fixes. Every new client still needs its own Google/Apple provider setup and a physical-device verification before TestFlight is considered production-ready.

2. Expand owner-facing analytics.
   Point add/remove and reward redemption operations are now logged in `loyalty_events`, but owners still need clearer metrics: active users, repeat customers, reward redemptions, push conversion, and retention.

3. Finish production identity per clone.
   Native identity now comes from `clients/<slug>/client.config.json`, but every real client still needs dedicated EAS project id, App Store Connect app, icons, splash, screenshots, support/privacy metadata, and OAuth redirect/provider settings.

4. Make clone setup deterministic.
   Follow and keep improving `docs/client-launch-runbook.md`: migrations, Edge Functions, secrets, `pg_cron`, first admin user, EAS env, bundle id, app scheme, dashboard deploy, seed SQL, readiness report, and smoke tests.

5. Decide scheduler source of truth.
   Live scheduled pushes run via Supabase `pg_cron`. GitHub Actions should remain manual fallback only, otherwise duplicate schedulers could race.

## Medium Priority

- Add push open handling for cold-start notification taps with `getLastNotificationResponse` plus clear-after-handle.
- Clean old test push campaigns/jobs before handing the dashboard to a restaurant owner.
- Add basic dashboard analytics: users, push tokens, sent pushes, opens, active scheduled jobs, point events.
- Add clearer error handling on admin menu writes.
- Add proper font loading/configuration for custom brand fonts.
- Add privacy policy/support URL checklist per client.
- Move admin RPC actions to Edge Functions or a private schema if we want to eliminate Supabase `SECURITY DEFINER` advisories.
- Move `pg_net` out of `public` or accept/document it as part of the cron setup.
- Enable Supabase leaked password protection in Auth settings.

## Commercial Readiness

Ready for:
- Laura TestFlight and real-world pilot usage.
- First controlled clone with developer supervision.
- Pitching the product as an early pilot/MVP.

Not ready for:
- Rapid unsupervised cloning.
- 50-100 client operations without a template checklist and config layer.
- Strong loyalty analytics/reporting claims.
- Hands-off restaurant owner onboarding.

## Clone Smoke Test Checklist

For every new restaurant:

1. Create new app folder/repo from template.
2. Replace tenant config and assets.
3. Create new Supabase project.
4. Apply migrations.
5. Deploy Edge Functions.
6. Set Supabase secrets: service role usage, anon key, cron secret.
7. Create Supabase `pg_cron` scheduled runner.
8. Create first admin profile.
9. Set EAS env vars.
10. Change app name, slug, scheme, bundle identifier, EAS project id.
11. Build TestFlight.
12. Deploy admin dashboard with client-specific base path/env.
13. Smoke test: login, profile, delete account, menu, points, staff point adjustment, push permission, immediate push, scheduled push, push history.
