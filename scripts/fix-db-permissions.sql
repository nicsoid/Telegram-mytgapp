-- Fix PostgreSQL permissions for Prisma migrations
-- Run this as the postgres superuser

-- Connect to the database
\c mytgapp

-- Grant usage on schema public
GRANT USAGE ON SCHEMA public TO postgres;

-- Grant all privileges on schema public
GRANT ALL ON SCHEMA public TO postgres;

-- Grant all privileges on all tables in public schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;

-- Grant all privileges on all sequences in public schema
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Grant all privileges on all functions in public schema
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;

-- Make sure the user can create objects
ALTER USER postgres CREATEDB;

-- Verify permissions
\dn+ public

