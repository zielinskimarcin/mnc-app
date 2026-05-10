-- Push token/open writes now go through Edge Functions:
-- register_push_token and track_push_open.
--
-- DO NOT put this file in supabase/migrations until the mobile build using
-- those functions has shipped, because older TestFlight builds write directly
-- to these tables.

revoke all on public.push_tokens from anon, authenticated;

drop policy if exists "push_insert_public" on public.push_tokens;
drop policy if exists "push_update_public" on public.push_tokens;
drop policy if exists "push_tokens_insert_public" on public.push_tokens;
drop policy if exists "push_tokens_update_public" on public.push_tokens;

revoke all on public.push_opens from anon, authenticated;

drop policy if exists "push_opens_insert_public" on public.push_opens;

create index if not exists push_opens_campaign_id_idx on public.push_opens(campaign_id);
create index if not exists push_opens_user_id_idx on public.push_opens(user_id);
