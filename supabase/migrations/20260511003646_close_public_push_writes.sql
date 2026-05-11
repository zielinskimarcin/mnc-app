-- Push token/open writes now go through Edge Functions:
-- register_push_token and track_push_open.

revoke all on public.push_tokens from anon, authenticated;

drop policy if exists "push_insert_public" on public.push_tokens;
drop policy if exists "push_update_public" on public.push_tokens;
drop policy if exists "push_tokens_insert_public" on public.push_tokens;
drop policy if exists "push_tokens_update_public" on public.push_tokens;
drop policy if exists "push_tokens_service_all" on public.push_tokens;

create policy "push_tokens_service_all"
on public.push_tokens
for all
to service_role
using (true)
with check (true);

revoke all on public.push_opens from anon, authenticated;
grant select on public.push_opens to authenticated;

drop policy if exists "push_opens_insert_public" on public.push_opens;
drop policy if exists "push_opens_staff_admin_read" on public.push_opens;

create policy "push_opens_staff_admin_read"
on public.push_opens
for select
to authenticated
using (public.is_staff_or_admin());

create index if not exists push_opens_user_id_idx on public.push_opens(user_id);
