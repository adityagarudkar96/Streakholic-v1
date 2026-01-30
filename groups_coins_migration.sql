-- Add Coin features to Groups
alter table public.groups
add column if not exists is_coin_enabled boolean default false,
add column if not exists stake_amount int default 0,
add column if not exists daily_penalty int default 0,
add column if not exists reward_pool int default 0;

-- Add Coin tracking to Group Members
alter table public.group_members
add column if not exists locked_balance int default 0;

-- Check constraint to ensure positive values
alter table public.groups
add constraint positive_stake check (stake_amount >= 0),
add constraint positive_penalty check (daily_penalty >= 0);
