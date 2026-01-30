-- Update lock transactions with ANY amount (0 or others) based on the actual group stake
-- This ensures that if you joined a 500 coin group, it shows -500. If 100, shows -100.

UPDATE public.coin_transactions
SET amount = -g.stake_amount
FROM public.groups g
WHERE public.coin_transactions.group_id = g.id
AND public.coin_transactions.type = 'lock'
AND g.stake_amount > 0;
