-- Avoid multiple permissive SELECT policies while keeping behavior unchanged.

drop policy if exists "profiles_read_own" on public.profiles;
drop policy if exists "profiles_staff_admin_select" on public.profiles;
drop policy if exists "profiles_select_own_or_staff" on public.profiles;

create policy "profiles_select_own_or_staff"
on public.profiles
for select
to authenticated
using (((select auth.uid()) = id) or public.is_staff_or_admin());

drop policy if exists "menu_staff_admin_write" on public.menu_items;
drop policy if exists "menu_staff_admin_insert" on public.menu_items;
drop policy if exists "menu_staff_admin_update" on public.menu_items;
drop policy if exists "menu_staff_admin_delete" on public.menu_items;

create policy "menu_staff_admin_insert"
on public.menu_items
for insert
to authenticated
with check (public.is_staff_or_admin());

create policy "menu_staff_admin_update"
on public.menu_items
for update
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

create policy "menu_staff_admin_delete"
on public.menu_items
for delete
to authenticated
using (public.is_staff_or_admin());
