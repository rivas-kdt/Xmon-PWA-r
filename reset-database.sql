-- Disable foreign key checks temporarily to allow dropping tables
SET session_replication_role = 'replica';

-- Drop all tables if they exist
DROP TABLE IF EXISTS public.transaction_history CASCADE;
DROP TABLE IF EXISTS public.parts_location CASCADE;
DROP TABLE IF EXISTS public.worker_location CASCADE;
DROP TABLE IF EXISTS public.recipients CASCADE;
DROP TABLE IF EXISTS public.parts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.warehouse CASCADE;
DROP TABLE IF EXISTS public.recipients CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- (Optional) Drop any existing indexes
DROP INDEX IF EXISTS idx_parts_production_no;
DROP INDEX IF EXISTS idx_parts_status;

-- (Optional) Drop pgcrypto extension (if you want to remove it)
DROP EXTENSION IF EXISTS pgjwt CASCADE;
DROP EXTENSION IF EXISTS pgcrypto;

