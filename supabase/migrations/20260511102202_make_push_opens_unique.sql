-- Track one open row per campaign/token pair and update it on repeated taps.

drop index if exists public.push_opens_campaign_token_unique;

create unique index if not exists push_opens_campaign_token_unique
on public.push_opens (campaign_id, expo_push_token);
