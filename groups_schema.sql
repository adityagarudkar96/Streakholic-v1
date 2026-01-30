-- Create groups table
create table if not exists public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  invite_code text unique not null,
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create group_members table
create table if not exists public.group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  role text check (role in ('admin', 'member')) default 'member',
  unique(group_id, user_id)
);

-- Enable RLS
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- Policies for Groups
create policy "Groups are viewable by everyone" 
  on groups for select using (true);

create policy "Authenticated users can create groups" 
  on groups for insert with check (auth.uid() = created_by);

-- Policies for Group Members
create policy "Group members are viewable by everyone" 
  on group_members for select using (true);

create policy "Users can join groups" 
  on group_members for insert with check (auth.uid() = user_id);

create policy "Users can leave groups" 
  on group_members for delete using (auth.uid() = user_id);
