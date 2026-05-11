-- Cleanup for projects that briefly had a duplicate push_opens campaign index.
-- Also keeps push_tokens closed to app roles while satisfying RLS policy linting.

drop index if exists public.push_opens_campaign_id_idx;

drop policy if exists "push_tokens_service_all" on public.push_tokens;

create policy "push_tokens_service_all"
on public.push_tokens
for all
to service_role
using (true)
with check (true);
