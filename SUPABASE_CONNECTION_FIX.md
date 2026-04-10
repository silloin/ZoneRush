# 🔧 Database Connection Fix for Supabase

## ❌ Error You're Seeing

```
Database connection error Error: connect ENETUNREACH 2406:da14:271:9900::...:5432
```

This means your app can't connect to Supabase database.

---

## ✅ Solution

### **Step 1: Get Correct Supabase Connection String**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** (gear icon) → **Database**
4. Find **"Connection string"** section
5. Select **"URI"** tab
6. **IMPORTANT:** Choose **"Transaction"** mode (port 6543), NOT "Session" mode

Your connection string should look like:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Example:**
```
postgresql://postgres.abc123def:MyP@ssw0rd@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

---

### **Step 2: Update DATABASE_URL in Render**

1. Go to **Render Dashboard**
2. Click your **web service**
3. Go to **"Environment"** tab
4. Find `DATABASE_URL`
5. **Update it** with the correct connection string from Step 1
6. Click **"Save Changes"**

---

### **Step 3: Verify PostGIS is Enabled**

1. In Supabase Dashboard, go to **SQL Editor**
2. Run this query:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   SELECT PostGIS_Version();
   ```
3. Should return: `3.x.x`

---

## 🔍 Common Issues

### **Issue 1: Wrong Port**

❌ **Wrong:** Port `5432` (direct connection - often blocked)
✅ **Correct:** Port `6543` (connection pooling - works on Render)

### **Issue 2: Wrong Username**

❌ **Wrong:** Just `postgres`
✅ **Correct:** `postgres.[YOUR-PROJECT-REF]`

**Example:**
- Project ref: `abc123def`
- Username: `postgres.abc123def`

### **Issue 3: Password Incorrect**

- Make sure you're using the password you set when creating the project
- Special characters need to be URL-encoded:
  - `@` → `%40`
  - `#` → `%23`
  - `$` → `%24`
  - Space → `%20`

### **Issue 4: IPv6 Connection Error**

If you see `ENETUNREACH` or IPv6 errors:

1. Make sure you're using the **pooler** URL (contains `pooler.supabase.com`)
2. Use **Transaction mode** (port 6543)
3. Don't use the direct connection URL

---

## ✅ Correct DATABASE_URL Format

```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Real Example:**
```env
DATABASE_URL=postgresql://postgres.xyzabcdef:MyPassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

---

## 🔧 Test Connection Locally

Before deploying, test the connection string locally:

```bash
cd server
node test-database-connection.js
```

Or manually test with psql:
```bash
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
```

If it connects successfully, it will work on Render!

---

## 📋 Checklist

- [ ] Using **Transaction mode** (port 6543)
- [ ] Username includes project ref: `postgres.[PROJECT-REF]`
- [ ] Password is correct
- [ ] URL contains `pooler.supabase.com`
- [ ] PostGIS extension enabled
- [ ] DATABASE_URL updated in Render
- [ ] Service redeployed after updating DATABASE_URL

---

## 🚀 After Fixing

1. Update DATABASE_URL in Render
2. Redeploy service
3. Check logs - should see:
   ```
   ✅ Database connected
   🔄 Initializing database schema...
   ✅ PostGIS extension ready
   ✅ Successfully executed postgis_setup.sql
   ✅ Successfully executed setup_database.sql
   ```

---

**Still having issues? Check Render logs for detailed error messages!**
