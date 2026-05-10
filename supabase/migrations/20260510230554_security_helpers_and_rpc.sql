-- Security helper functions and checked RPC endpoints for dashboard actions.

create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke execute on function public.is_staff_or_admin() from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_staff_or_admin() to authenticated;
grant execute on function public.is_admin() to authenticated;

create or replace function public.generate_short_code()
returns text
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  code text;
  attempts int := 0;
begin
  loop
    attempts := attempts + 1;
    code := lpad((floor(random() * 1000))::int::text, 3, '0');

    if not exists (select 1 from public.profiles where short_code = code) then
      return code;
    end if;

    if attempts > 2000 then
      raise exception 'Could not generate unique short code';
    end if;
  end loop;
end;
$function$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  insert into public.profiles (id, email, short_code)
  values (new.id, new.email, public.generate_short_code());
  return new;
end;
$function$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.generate_short_code() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

create or replace function public.admin_set_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  if p_role not in ('admin', 'staff', 'user') then
    raise exception 'Invalid role';
  end if;

  update public.profiles
  set role = p_role
  where id = p_user_id;

  if not found then
    raise exception 'User not found';
  end if;
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

  select role into v_role
  from public.profiles
  where id = p_user_id;

  if v_role = 'admin' then
    raise exception 'Nie można usunąć administratora';
  end if;

  delete from public.push_tokens where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$function$;

create or replace function public.staff_adjust_points_by_code(
  p_short_code text,
  p_delta integer
)
returns table(id uuid, points integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_code text := trim(p_short_code);
begin
  if not public.is_staff_or_admin() then
    raise exception 'Forbidden';
  end if;

  if p_delta not in (-1, 1) then
    raise exception 'Invalid delta';
  end if;

  if v_code !~ '^[0-9]{3}$' then
    raise exception 'Kod musi mieć dokładnie 3 cyfry';
  end if;

  return query
  update public.profiles p
  set points = greatest(0, p.points + p_delta)
  where p.short_code = v_code
  returning p.id, p.points;

  if not found then
    raise exception 'Nie znaleziono profilu';
  end if;
end;
$function$;

revoke execute on function public.admin_set_role(uuid, text) from public, anon;
revoke execute on function public.admin_delete_user(uuid) from public, anon;
revoke execute on function public.staff_adjust_points_by_code(text, integer) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.staff_adjust_points_by_code(text, integer) to authenticated;
