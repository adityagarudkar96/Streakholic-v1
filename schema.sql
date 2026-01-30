-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text,
  leetcode_username text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_activity_date timestamp with time zone,
  current_streak int default 0,
  longest_streak int default 0
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create daily_logs table
create table if not exists public.daily_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  status text check (status in ('success', 'miss', 'pending')),
  problems_solved int default 0,
  accepted_submissions int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.daily_logs enable row level security;

create policy "Users can view their own logs"
  on daily_logs for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own logs"
    on daily_logs for insert
    with check ( auth.uid() = user_id );

-- Handle new user signup trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
