# Deployment Fixes - Render + Supabase

## Critical Error: Missing capture_count Column

**Error**: `column "capture_count" of relation "captured_tiles" does not exist`

### Fix: Run this SQL in Supabase Query Editor

```sql
-- 1. Add the missing capture_count column
ALTER TABLE captured_tiles 
ADD COLUMN IF NOT EXISTS capture_count INTEGER DEFAULT 1;

-- 2. Verify the fix
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'captured_tiles' 
ORDER BY ordinal_position;
```

### Expected Output After Fix
Column list should include:
- id (integer)
- tile_id (integer) 
- user_id (integer)
- run_id (integer)
- **capture_count (integer)** ← NEW
- first_captured_at (timestamp)
- last_captured_at (timestamp)

---

## Other Potential Schema Issues to Check

Run this in Supabase to verify all tables exist:

```sql
-- Check all required tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should include:
-- - users
-- - runs
-- - achievements
-- - user_achievements
-- - posts
-- - comments
-- - likes
-- - tiles
-- - captured_tiles
-- - geofences
-- - ... and more
```

---

## Email Verification Timeout (Non-Critical)

The warning "Email transporter verification failed" is **NOT a blocker** - the app will continue working.

However, to fix it, in Render Dashboard add these environment variables:

```
MAILGUN_DOMAIN = your-mailgun-domain.mailgun.org
MAILGUN_USER = postmaster@your-mailgun-domain.mailgun.org
MAILGUN_PASSWORD = your-mailgun-api-key

OR use custom SMTP:

SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_SECURE = false
EMAIL_USER = your-email@gmail.com
EMAIL_APP_PASSWORD = your-app-password
```

---

## Socket Error: [location-update] Ignored - currentRunId: null

This is **expected behavior**, not an error. It means:
- User hasn't started a run yet
- Location updates are ignored until they start tracking
- This prevents database clutter

**No fix needed** - this is working as designed.

---

## Steps to Deploy Fix

1. **Go to Supabase Console**
   - https://app.supabase.com

2. **Navigate to SQL Editor**

3. **Run this query first**:
```sql
ALTER TABLE captured_tiles 
ADD COLUMN IF NOT EXISTS capture_count INTEGER DEFAULT 1;
```

4. **Verify with**:
```sql
SELECT count(*) FROM captured_tiles;
```

5. **Restart your Render server**
   - Go to Render Dashboard > Services > zonerush > Manual Deploy

6. **Test in your app**:
   - Start a tracking session
   - Generate tiles by moving around
   - Check Render logs for "✅ Capturing tile" instead of errors

---

## Prevention: Schema Migrations

In future, use migration files to apply schema changes:

```bash
# Create migration
git checkout -b fix-captured-tiles-schema
# Add migration_fix_captured_tiles.sql
git add .
git commit -m "Add migration: fix captured_tiles schema"
git push origin fix-captured-tiles-schema
# Create PR and merge
```

---

## Quick Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `column "X" does not exist` | Schema mismatch | Run migration in Supabase |
| `Email transporter failed` | Missing env vars | Set EMAIL_* vars in Render |
| `Ignored - currentRunId: null` | Expected behavior | No fix needed |
| `Socket timeout` | Network issue | Check Render logs |
| `Connection refused` | Database not connected | Verify DATABASE_URL |
