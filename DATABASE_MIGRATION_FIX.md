# Database Migration Fix - Login 500 Error

## Issue Fixed ✅

**Error:** `POST /api/auth/login 500 (Internal Server Error)`  
**Message:** `relation "login_attempts" does not exist`

**Root Cause:** Your Render database is missing critical security tables that the authentication system requires.

---

## Quick Fix (Choose One Method)

### **Method 1: Run Migration Script (Recommended)** ⭐

This will automatically create all missing tables on your Render database.

#### Step 1: Set DATABASE_URL Environment Variable

Make sure your Render service has `DATABASE_URL` set in environment variables:
- Go to Render Dashboard → Your Service → Environment
- Add: `DATABASE_URL` = `postgresql://...` (your Supabase/Render database URL)

#### Step 2: Run the Migration

**Option A: Run Locally (connects to Render database)**

```bash
# Navigate to server directory
cd server

# Install dependencies (if not already done)
npm install

# Run migration
node migrate-security-tables.js
```

**Option B: Run via Render Shell**

1. Go to Render Dashboard → Your Backend Service
2. Click **Shell** tab
3. Run:
   ```bash
   cd /opt/render/project/src/server
   node migrate-security-tables.js
   ```

#### Expected Output:
```
🔒 Starting Security Tables Migration
═══════════════════════════════════════════════════════════

1️⃣  Creating login_attempts table...
   ✅ login_attempts table created

2️⃣  Creating token_blacklist table...
   ✅ token_blacklist table created

3️⃣  Adding account security columns...
   ✅ Added account_locked column
   ✅ Added lockout_until column
   ✅ Added last_failed_login column

4️⃣  Creating password_history table...
   ✅ password_history table created

5️⃣  Creating security_events table...
   ✅ security_events table created

6️⃣  Creating password_resets table...
   ✅ password_resets table created

7️⃣  Creating email_verifications table...
   ✅ email_verifications table created

═══════════════════════════════════════════════════════════
✅ Migration completed successfully!

📋 Tables created:
   • login_attempts - Brute force protection
   • token_blacklist - Session invalidation
   • password_history - Password reuse prevention
   • security_events - Audit logging
   • password_resets - Password reset tokens
   • email_verifications - Email verification

🔧 Your login should now work properly!
```

---

### **Method 2: Run SQL Manually**

If you prefer to run SQL directly (e.g., via Supabase SQL Editor or pgAdmin):

#### Step 1: Open SQL Editor

**For Supabase:**
1. Go to Supabase Dashboard
2. Click **SQL Editor**
3. Click **New Query**

**For Render PostgreSQL:**
- Use pgAdmin, DBeaver, or any PostgreSQL client
- Connect to your database

#### Step 2: Run Migration SQL

Copy and paste the entire content of:
```
database/migration_add_security_tables.sql
```

Run it in your SQL editor.

#### Step 3: Verify Tables Created

Run this query to verify:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'login_attempts', 
  'token_blacklist', 
  'password_history', 
  'security_events', 
  'password_resets', 
  'email_verifications'
)
ORDER BY table_name;
```

You should see all 6 tables listed.

---

## What Tables Are Created

### 1. **login_attempts**
Tracks failed login attempts for brute force protection.
- `id` - Primary key
- `user_id` - Reference to users table
- `ip_address` - IP of login attempt
- `attempted_at` - Timestamp

### 2. **token_blacklist**
Stores invalidated JWT tokens for logout/session management.
- `id` - Primary key
- `token_jti` - Unique token identifier
- `expires_at` - Token expiration
- `created_at` - Creation timestamp

### 3. **password_history**
Prevents password reuse.
- `id` - Primary key
- `user_id` - Reference to users table
- `password_hash` - Historical password hash
- `created_at` - Creation timestamp

### 4. **security_events**
Audit log for security-related events.
- `id` - Primary key
- `user_id` - Reference to users table
- `event_type` - Type of event (login, logout, etc.)
- `ip_address` - IP address
- `user_agent` - Browser/client info
- `details` - Additional JSON data
- `created_at` - Timestamp

### 5. **password_resets**
Stores password reset tokens.
- `id` - Primary key
- `user_id` - Reference to users table
- `token` - Unique reset token
- `expires_at` - Token expiration
- `used` - Whether token was used
- `created_at` - Creation timestamp

### 6. **email_verifications**
Stores email verification tokens.
- `id` - Primary key
- `user_id` - Reference to users table
- `token` - Unique verification token
- `expires_at` - Token expiration
- `verified` - Whether email was verified
- `created_at` - Creation timestamp

### 7. **Users Table Columns Added**
- `account_locked` - Boolean, whether account is locked
- `lockout_until` - Timestamp, when lockout expires
- `last_failed_login` - Timestamp, last failed attempt

---

## After Migration

### 1. Restart Your Render Service

Go to Render Dashboard → Your Service → **Manual Deploy** → **Deploy latest commit**

Or simply trigger a new deployment by pushing to Git.

### 2. Test Login

Try logging in again:
- ✅ Should no longer get 500 error
- ✅ Login should work normally
- ✅ Failed attempts should be tracked
- ✅ Account lockout should work after 5 failed attempts

### 3. Check Render Logs

Verify no database errors:
```
✅ No "relation does not exist" errors
✅ Login requests returning 200 OK
✅ Authentication working properly
```

---

## Troubleshooting

### Error: "Cannot find module './config/db'"

**Solution:** Make sure you're running the script from the `server` directory:
```bash
cd server
node migrate-security-tables.js
```

### Error: "DATABASE_URL is not set"

**Solution:** Add DATABASE_URL to your environment variables in Render Dashboard.

### Error: "Permission denied to create table"

**Solution:** Make sure your database user has CREATE TABLE permissions. For Supabase, use the `postgres` role.

### Tables Already Exist

The migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times. It will skip tables that already exist.

---

## Security Features Now Enabled

After running this migration, these security features will work:

✅ **Brute Force Protection** - Locks account after 5 failed attempts  
✅ **Session Management** - Proper logout with token blacklisting  
✅ **Password History** - Prevents reusing old passwords  
✅ **Audit Logging** - Tracks security events  
✅ **Password Reset** - Secure token-based password reset  
✅ **Email Verification** - Token-based email verification  
✅ **Account Lockout** - Temporary lockout after failed attempts  

---

## Files Created

1. ✅ `database/migration_add_security_tables.sql` - SQL migration file
2. ✅ `server/migrate-security-tables.js` - Node.js migration script
3. ✅ `DATABASE_MIGRATION_FIX.md` - This guide

---

## Summary

**Problem:** Missing database tables causing 500 errors on login  
**Solution:** Run migration to create security tables  
**Result:** Login works, security features enabled  

**Run the migration now and your login will work!** 🎉
