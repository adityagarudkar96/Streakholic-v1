-- Force update any zero-amount lock transactions to -50 (the default stake)
-- This covers cases where the JOIN might have failed or group stake was 0.

UPDATE public.coin_transactions
SET amount = -50
WHERE type = 'lock' 
AND amount = 0;
