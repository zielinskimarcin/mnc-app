-- Avoid per-row auth helper evaluation in loyalty event RLS.

drop policy if exists "loyalty_events_select_own_or_staff" on public.loyalty_events;

create policy "loyalty_events_select_own_or_staff"
on public.loyalty_events
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (select public.is_staff_or_admin())
);
