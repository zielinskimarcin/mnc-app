-- Audit trail for staff point adjustments.

create table if not exists public.loyalty_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  staff_id uuid references public.profiles(id) on delete set null,
  delta integer not null check (delta <> 0),
  points_after integer not null check (points_after >= 0),
  reason text not null default 'manual_adjustment',
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.loyalty_events is
  'Append-only loyalty point adjustment events for owner/staff audit.';

create index if not exists loyalty_events_profile_created_idx
on public.loyalty_events (profile_id, created_at desc);

create index if not exists loyalty_events_staff_created_idx
on public.loyalty_events (staff_id, created_at desc);

alter table public.loyalty_events enable row level security;

revoke all on public.loyalty_events from anon, authenticated;
grant select on public.loyalty_events to authenticated;
grant all on public.loyalty_events to service_role;

drop policy if exists "loyalty_events_select_own_or_staff" on public.loyalty_events;
drop policy if exists "loyalty_events_service_all" on public.loyalty_events;

create policy "loyalty_events_select_own_or_staff"
on public.loyalty_events
for select
to authenticated
using (
  profile_id = auth.uid()
  or public.is_staff_or_admin()
);

create policy "loyalty_events_service_all"
on public.loyalty_events
for all
to service_role
using (true)
with check (true);

drop function if exists public.staff_adjust_points_by_code(text, integer);

create function public.staff_adjust_points_by_code(
  p_short_code text,
  p_delta integer
)
returns table(id uuid, points integer, event_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_code text := trim(p_short_code);
  v_profile_id uuid;
  v_staff_id uuid := auth.uid();
  v_previous_points integer;
  v_points integer;
  v_actual_delta integer;
  v_event_id uuid;
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

  select p.id, coalesce(p.points, 0)
  into v_profile_id, v_previous_points
  from public.profiles p
  where p.short_code = v_code
  for update;

  if not found then
    raise exception 'Nie znaleziono profilu';
  end if;

  v_points := greatest(0, v_previous_points + p_delta);
  v_actual_delta := v_points - v_previous_points;

  if v_actual_delta = 0 then
    raise exception 'Profil ma już 0 punktów';
  end if;

  update public.profiles p
  set points = v_points
  where p.id = v_profile_id;

  insert into public.loyalty_events (
    profile_id,
    staff_id,
    delta,
    points_after,
    reason
  )
  values (
    v_profile_id,
    v_staff_id,
    v_actual_delta,
    v_points,
    'manual_adjustment'
  )
  returning loyalty_events.id into v_event_id;

  return query select v_profile_id, v_points, v_event_id;
end;
$function$;

revoke execute on function public.staff_adjust_points_by_code(text, integer) from public, anon;
grant execute on function public.staff_adjust_points_by_code(text, integer) to authenticated;
