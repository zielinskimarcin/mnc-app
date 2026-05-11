-- Staff action for redeeming a full loyalty reward.

create or replace function public.staff_redeem_reward_by_code(
  p_short_code text
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
  v_reward_points integer := 10;
  v_event_id uuid;
begin
  if not public.is_staff_or_admin() then
    raise exception 'Forbidden';
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

  if v_previous_points < v_reward_points then
    raise exception 'Za mało punktów do odbioru nagrody';
  end if;

  v_points := v_previous_points - v_reward_points;

  update public.profiles p
  set points = v_points
  where p.id = v_profile_id;

  insert into public.loyalty_events (
    profile_id,
    staff_id,
    delta,
    points_after,
    reason,
    metadata
  )
  values (
    v_profile_id,
    v_staff_id,
    -v_reward_points,
    v_points,
    'reward_redemption',
    jsonb_build_object('reward_points', v_reward_points)
  )
  returning loyalty_events.id into v_event_id;

  return query select v_profile_id, v_points, v_event_id;
end;
$function$;

revoke execute on function public.staff_redeem_reward_by_code(text) from public, anon;
grant execute on function public.staff_redeem_reward_by_code(text) to authenticated;
