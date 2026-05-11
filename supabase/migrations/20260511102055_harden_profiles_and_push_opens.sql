-- Extra production hardening for admin roles, profile data, and push analytics.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_valid
      check (role in ('admin', 'staff', 'user'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_points_nonnegative'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_points_nonnegative
      check (points >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_short_code_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_short_code_format
      check (short_code is null or short_code ~ '^[0-9]{3}$');
  end if;
end $$;

create unique index if not exists push_opens_campaign_token_unique
on public.push_opens (campaign_id, expo_push_token)
where campaign_id is not null;

create or replace function public.admin_set_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_role text;
  v_admin_count integer;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  if p_role not in ('admin', 'staff', 'user') then
    raise exception 'Invalid role';
  end if;

  select role
  into v_current_role
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'User not found';
  end if;

  if v_current_role = 'admin' and p_role <> 'admin' then
    select count(*)
    into v_admin_count
    from public.profiles
    where role = 'admin';

    if v_admin_count <= 1 then
      raise exception 'Nie można usunąć ostatniego administratora';
    end if;
  end if;

  update public.profiles
  set role = p_role
  where id = p_user_id;
end;
$function$;

create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_role text;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  select role
  into v_role
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'User not found';
  end if;

  if v_role = 'admin' then
    raise exception 'Nie można usunąć administratora';
  end if;

  delete from public.push_tokens where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$function$;

revoke execute on function public.admin_set_role(uuid, text) from public, anon;
revoke execute on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
