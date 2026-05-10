-- Push tokens: app can register/update tokens, but public reads/deletes are closed.

revoke all on public.push_tokens from anon, authenticated;
grant insert, update on public.push_tokens to anon, authenticated;

drop policy if exists "everything" on public.push_tokens;
drop policy if exists "push_insert_public" on public.push_tokens;
drop policy if exists "push_update_public" on public.push_tokens;
drop policy if exists "push_select_service" on public.push_tokens;
drop policy if exists "push_tokens_insert_public" on public.push_tokens;
drop policy if exists "push_tokens_update_public" on public.push_tokens;

create policy "push_tokens_insert_public"
on public.push_tokens
for insert
to anon, authenticated
with check (true);

create policy "push_tokens_update_public"
on public.push_tokens
for update
to anon, authenticated
using (true)
with check (true);

-- Push jobs/campaigns: dashboard staff/admin operations.

grant select, insert, update, delete on public.push_jobs to authenticated;
grant select, delete on public.push_campaigns to authenticated;

drop policy if exists "push_jobs_staff_admin_all" on public.push_jobs;
drop policy if exists "push_campaigns_admin_read" on public.push_campaigns;
drop policy if exists "push_campaigns_staff_admin_read" on public.push_campaigns;
drop policy if exists "push_campaigns_staff_admin_delete" on public.push_campaigns;

create policy "push_jobs_staff_admin_all"
on public.push_jobs
for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

create policy "push_campaigns_staff_admin_read"
on public.push_campaigns
for select
to authenticated
using (public.is_staff_or_admin());

create policy "push_campaigns_staff_admin_delete"
on public.push_campaigns
for delete
to authenticated
using (public.is_staff_or_admin());

-- Opens stay public insert for now because notification taps may be logged before
-- a user is signed in. This will move behind an Edge Function in the next hardening pass.

revoke all on public.push_opens from anon, authenticated;
grant insert on public.push_opens to anon, authenticated;

drop policy if exists "push_opens_insert_public" on public.push_opens;
create policy "push_opens_insert_public"
on public.push_opens
for insert
to anon, authenticated
with check (true);

create index if not exists push_tokens_user_id_idx on public.push_tokens(user_id);
create index if not exists push_jobs_created_by_idx on public.push_jobs(created_by);
