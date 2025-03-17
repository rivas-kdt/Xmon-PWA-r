-- ============================
-- X-Mon External Warehouse Monitoring Database Setup
-- ============================

-- Enable pgcrypto extension (needed for bcrypt hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create Warehouse Table First (since others reference it)
CREATE TABLE IF NOT EXISTS public.warehouse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location TEXT NOT NULL,
    warehouse TEXT NOT NULL DEFAULT '', -- ✅ New column to store warehouse name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Users Table (with `bcrypt` password hashing)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,  -- ✅ Will store bcrypt-hashed passwords
    role TEXT NOT NULL CHECK (role IN ('admin', 'worker')) DEFAULT 'worker', -- ✅ Role constraint & default
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Parts Table (✅ Make `production_no` the Primary Key)
CREATE TABLE IF NOT EXISTS public.parts (
    production_no TEXT PRIMARY KEY,  -- ✅ Primary Key
    product_code TEXT,
    lot_no TEXT,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('stocked', 'shipped')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Recipients Table
CREATE TABLE IF NOT EXISTS public.recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Worker Location Table (References `warehouse` & `users`)
CREATE TABLE IF NOT EXISTS public.worker_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES public.warehouse(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Parts Location Table (References `warehouse` & `parts.production_no`)
CREATE TABLE IF NOT EXISTS public.parts_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parts_id TEXT REFERENCES public.parts(production_no) ON DELETE CASCADE,  -- ✅ Correct FK reference
    warehouse_id UUID REFERENCES public.warehouse(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Transaction History Table (References `parts.production_no` and `users.id`)
CREATE TABLE IF NOT EXISTS public.transaction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parts_id TEXT REFERENCES public.parts(production_no) ON DELETE CASCADE,  -- ✅ Correct FK reference
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,  -- ✅ Tracks who performed the transaction
    status TEXT NOT NULL CHECK (status IN ('stocked', 'shipped')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create email_schedule table
CREATE TABLE IF NOT EXISTS public.email_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    days TEXT[] NOT NULL,
    time TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================
-- Default Data Inserts
-- ============================

-- Add Default Recipient
INSERT INTO public.recipients (email)
VALUES ('tagumpayfund@gmail.com')
ON CONFLICT DO NOTHING;

-- Insert Admin User with a Hashed Password
INSERT INTO public.users (username, email, password_hash, role)
VALUES (
    'admin',
    'tagumpayfund@gmail.com',
    crypt('admin1234', gen_salt('bf')),  -- ✅ Hashing the password using bcrypt
    'admin'
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = crypt('admin1234', gen_salt('bf')),  -- ✅ Ensures password gets updated if email exists
    role = 'admin';

-- ============================
-- Indexes for Performance Optimization
-- ============================

CREATE INDEX IF NOT EXISTS idx_parts_production_no ON public.parts(production_no);
CREATE INDEX IF NOT EXISTS idx_parts_status ON public.parts(status);
CREATE INDEX IF NOT EXISTS idx_email_schedule_enabled ON public.email_schedule(enabled);

