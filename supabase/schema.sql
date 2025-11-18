-- Create interactions table
create table if not exists public.interactions (
  id uuid default gen_random_uuid() primary key,
  wallet_address text not null,
  message text not null,
  shared_platform text not null check (shared_platform in ('twitter', 'farcaster')),
  share_link text not null,
  claimed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  claim_available_at timestamp with time zone not null
);

-- Add index on wallet_address for faster lookups
create index if not exists idx_interactions_wallet 
  on public.interactions (wallet_address);

-- Add index on claim_available_at for cooldown checks
create index if not exists idx_interactions_claim_available 
  on public.interactions (claim_available_at);

-- Add index on created_at for sorting
create index if not exists idx_interactions_created 
  on public.interactions (created_at desc);

-- Enable Row Level Security
alter table public.interactions enable row level security;

-- Create policy to allow anyone to read
create policy "Allow public read access"
  on public.interactions
  for select
  using (true);

-- Create policy to allow anyone to insert
create policy "Allow public insert access"
  on public.interactions
  for insert
  with check (true);

-- Create policy to allow users to update their own interactions
create policy "Allow users to update their own interactions"
  on public.interactions
  for update
  using (true)
  with check (true);

-- Create admin stats view
create or replace view public.interaction_stats as
select 
  count(*) as total_interactions,
  count(distinct wallet_address) as unique_users,
  count(*) filter (where claimed = true) as total_claimed,
  count(*) filter (where shared_platform = 'twitter') as twitter_shares,
  count(*) filter (where shared_platform = 'farcaster') as farcaster_shares
from public.interactions;

-- Grant access to the stats view
grant select on public.interaction_stats to anon, authenticated;
