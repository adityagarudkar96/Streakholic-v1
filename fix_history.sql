-- Backfill 'initial_grant' transactions for users who have positive balance but no history
insert into public.coin_transactions (user_id, amount, type, description, created_at)
select 
  id as user_id, 
  1000 as amount, 
  'initial_grant' as type, 
  'Welcome Bonus' as description,
  now() as created_at
from public.profiles
where coins_balance >= 1000
and not exists (
  select 1 from public.coin_transactions where user_id = profiles.id
);
