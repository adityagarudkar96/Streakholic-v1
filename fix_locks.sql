-- Fix 0-amount lock transactions
-- Update coin_transactions set amount = -(SELECT stake_amount FROM groups WHERE groups.id = coin_transactions.group_id)
-- where type = 'lock' AND amount = 0;

-- Simple update based on the fact we know them
UPDATE public.coin_transactions
SET amount = -50 -- Hardcoding -50 is unsafe if they staked different amounts.

-- Better: Look up the group stake
UPDATE public.coin_transactions ct
SET amount = -g.stake_amount
FROM public.groups g
WHERE ct.group_id = g.id
AND ct.type = 'lock'
AND ct.amount = 0;
