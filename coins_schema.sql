-- Add coin columns to profiles
alter table public.profiles 
add column if not exists coins_balance int default 1000,
add column if not exists coins_locked int default 0;

-- Backfill existing users (ensure everyone has at least 1000 if they were null or 0 defaults didn't apply retrospectively in some postgres versions depending on how rows were created, but usually default applies to new rows. For existing rows, we need to update.)
update public.profiles 
set coins_balance = 1000 
where coins_balance is null or coins_balance = 0;

-- Create transactions table
create table if not exists public.coin_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount int not null,
  type text check (type in ('initial_grant', 'penalty', 'reward', 'lock', 'unlock', 'adjustment')) not null,
  description text,
  group_id uuid references public.groups(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.coin_transactions enable row level security;

-- Policies
create policy "Users can view their own transactions" 
  on coin_transactions for select 
  using (auth.uid() = user_id);

-- Only system/service role should insert usually, but for MVP client-side logic:
create policy "Users can insert their own transactions" 
  on coin_transactions for insert 
  with check (auth.uid() = user_id);
