-- Script to manually fix the UserRole enum migration
-- Run this if the migration fails with the default casting error

-- Step 1: Drop the default constraint
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

-- Step 2: Check if PUBLISHER exists and create new enum
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PUBLISHER' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
    ) THEN
        -- Create new enum
        CREATE TYPE "UserRole_new" AS ENUM ('USER', 'ADMIN');
        
        -- Update User table (convert PUBLISHER to USER)
        ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" 
        USING (
            CASE 
                WHEN "role"::text = 'PUBLISHER' THEN 'USER'::"UserRole_new"
                ELSE "role"::text::"UserRole_new"
            END
        );
        
        -- Set new default
        ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER'::"UserRole_new";
        
        -- Drop old enum
        DROP TYPE "UserRole";
        
        -- Rename new enum
        ALTER TYPE "UserRole_new" RENAME TO "UserRole";
    END IF;
END $$;

