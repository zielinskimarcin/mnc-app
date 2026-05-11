-- app_config is currently read-only for the app.
-- Keep public reads, but do not expose write privileges to app roles.

revoke insert, update, delete on public.app_config from anon, authenticated;
grant select on public.app_config to anon, authenticated;
