-- Keep table grants aligned with RLS policies.
-- This reduces accidental access surface while preserving current app behavior.

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name) on public.profiles to authenticated;

revoke all on public.menu_items from anon, authenticated;
grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;

revoke all on public.push_jobs from anon, authenticated;
grant select, insert, update, delete on public.push_jobs to authenticated;

revoke all on public.push_campaigns from anon, authenticated;
grant select, delete on public.push_campaigns to authenticated;

revoke all on public.push_tokens from anon, authenticated;
grant insert, update on public.push_tokens to anon, authenticated;

revoke all on public.push_opens from anon, authenticated;
grant insert on public.push_opens to anon, authenticated;
grant select on public.push_opens to authenticated;

drop policy if exists "push_opens_staff_admin_read" on public.push_opens;

create policy "push_opens_staff_admin_read"
on public.push_opens
for select
to authenticated
using (public.is_staff_or_admin());
