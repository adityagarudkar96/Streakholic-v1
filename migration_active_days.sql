-- Add total_active_days to profiles
alter table public.profiles add column if not exists total_active_days int default 0;

-- Optional: Initial backfill
update public.profiles
set total_active_days = (
  select count(*) 
  from public.daily_logs 
  where daily_logs.user_id = profiles.id 
  and daily_logs.status = 'success'
);
