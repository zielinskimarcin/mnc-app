-- Profiles: users can read through RLS and directly update only their name.
-- Points/roles go through checked server functions.

revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name) on public.profiles to authenticated;

drop policy if exists "profiles select authenticated" on public.profiles;
drop policy if exists "profiles update admin only" on public.profiles;
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "profiles_read_own" on public.profiles;
drop policy if exists "profiles_staff_admin_select" on public.profiles;
drop policy if exists "profiles_update_own_name" on public.profiles;

create policy "profiles_read_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_staff_admin_select"
on public.profiles
for select
to authenticated
using (public.is_staff_or_admin());

create policy "profiles_update_own_name"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Menu: public read, staff/admin writes.

revoke all on public.menu_items from anon, authenticated;
grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;

drop policy if exists "anon all menu_items" on public.menu_items;
drop policy if exists "menu readable" on public.menu_items;
drop policy if exists "menu_staff_admin_write" on public.menu_items;

create policy "menu readable"
on public.menu_items
for select
to anon, authenticated
using (is_active = true);

create policy "menu_staff_admin_write"
on public.menu_items
for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());
