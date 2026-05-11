-- Keep app_config read-only for app roles.
-- Earlier grants left non-DML table privileges on anon/authenticated.

revoke all on table public.app_config from anon, authenticated;
grant select on table public.app_config to anon, authenticated;
