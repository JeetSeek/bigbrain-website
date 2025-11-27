# Database Migrations

This directory contains SQL migration files for the BoilerBrain database.

## Running Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Log in to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `001_create_chat_sessions.sql`
4. Paste into the SQL editor
5. Click **Run** to execute

### Option 2: Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migration
supabase db push
```

### Option 3: Direct PostgreSQL Connection

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run migration
\i server/migrations/001_create_chat_sessions.sql
```

## Migration Files

### 001_create_chat_sessions.sql

Creates the `chat_sessions` table for persistent chat session storage.

**Features:**
- UUID-based session IDs
- JSON storage for chat history
- Automatic expiration (30 minutes)
- Auto-updating timestamps
- Cleanup function for expired sessions
- Optimized indexes for performance

**Table Structure:**
```sql
chat_sessions (
  id SERIAL PRIMARY KEY,
  session_id UUID UNIQUE NOT NULL,
  user_id UUID,
  history JSONB DEFAULT '[]',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
)
```

## Verifying Migration

After running the migration, verify it was successful:

```sql
-- Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'chat_sessions'
);

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'chat_sessions';

-- Test cleanup function
SELECT cleanup_expired_chat_sessions();
```

## Rollback (if needed)

To rollback this migration:

```sql
DROP TRIGGER IF EXISTS trigger_update_chat_sessions_updated_at ON chat_sessions;
DROP FUNCTION IF EXISTS update_chat_sessions_updated_at();
DROP FUNCTION IF EXISTS cleanup_expired_chat_sessions();
DROP TABLE IF EXISTS chat_sessions;
```

## Scheduling Automatic Cleanup

### Option 1: pg_cron (Supabase Pro)

```sql
-- Run cleanup daily at 2 AM
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '0 2 * * *',
  'SELECT cleanup_expired_chat_sessions();'
);
```

### Option 2: External Cron Job

The backend server already runs cleanup every hour via `setInterval()` in `server/index.js`.

## Notes

- Sessions expire after 30 minutes of inactivity
- The backend has an in-memory fallback if the database is unavailable
- Frontend uses localStorage as primary storage with backend sync
- Cross-device session sync is supported via `/api/sessions/get` endpoint
