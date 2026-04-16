# Quick Secret Security Setup Guide

## 🚨 CRITICAL: Complete These Steps Before Deployment

---

## Step 1: Change Database Password (5 minutes)

### Current State:
- ❌ Password "8810" is hardcoded in 12+ files
- ❌ Password is only 4 digits (extremely weak)

### Fix:

```bash
# 1. Connect to PostgreSQL
psql -U postgres -h localhost

# 2. Change password (use strong 16+ char password)
ALTER USER postgres WITH PASSWORD 'YourStrongPassword123!@#';

# 3. Exit
\q
```

**Or use pgAdmin:**
1. Open pgAdmin
2. Right-click PostgreSQL server → Properties
3. Change password
4. Save

---

## Step 2: Create Environment Files (3 minutes)

### Backend (server/.env):

```bash
# Copy template
copy server\.env.example server\.env

# Edit with your values
notepad server\.env
```

**Required changes:**
```env
DB_PASSWORD=YourStrongPassword123!@#
JWT_SECRET=<run command below>
# ... replace all CHANGE_ME values
```

### Frontend (client/.env):

```bash
# Copy template
copy client\.env.example client\.env

# Edit with your Mapbox token
notepad client\.env
```

### Database Scripts (scripts/.env):

```bash
# Copy template
copy scripts\.env.example scripts\.env

# Edit with database password
notepad scripts\.env
```

**Set:**
```env
DB_PASSWORD=YourStrongPassword123!@#
```

---

## Step 3: Generate Strong JWT Secret (1 minute)

```bash
# Run this command
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copy the output (128 character hex string)
# Paste into server/.env:
JWT_SECRET=<paste_here>
```

---

## Step 4: Fix All .bat Files (2 minutes)

### Option A: Automated Fix (Recommended)

```bash
# Run the fixer script
fix-hardcoded-passwords.bat

# Review changes, then delete .bak files
del *.bak /s
```

### Option B: Manual Fix

Update each .bat file:

**Replace:**
```bat
set PGPASSWORD=8810
```

**With:**
```bat
if exist "scripts\.env" (
    for /f "tokens=1,2 delims==" %%a in (scripts\.env) do (
        set %%a=%%b
    )
)
set PGPASSWORD=%DB_PASSWORD%
```

**Files to fix:**
- create-zonerush-database.bat
- fix-territories-count.bat
- check-territories-count.bat
- apply-performance-fixes.bat
- apply-ai-training-migration.bat
- scripts/backup-database.bat
- scripts/restore-database.bat
- apply-profile-migration.bat
- apply-social-migration.bat
- apply-sos-migration.bat
- fix-sos-database.bat
- fix-all.bat
- migrate-and-test-sos.bat
- setup-everything.bat
- start-dev.bat
- start.bat
- test-sos-system.bat

---

## Step 5: Fix Node.js Scripts (5 minutes)

### Files with hardcoded passwords:

1. `server/check-email-status.js`
2. `server/check-email-verifications.js`
3. `server/apply-email-migration.js`
4. `server/test-sos-alert.js`

### Fix Pattern:

**Add at top of file:**
```javascript
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
```

**Replace:**
```javascript
const pool = new Pool({
  user: 'postgres',
  password: '8810',  // ← REMOVE THIS
  host: 'localhost',
  database: 'zonerush',
  port: 5432
});
```

**With:**
```javascript
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'zonerush',
  port: process.env.DB_PORT || 5432
});

if (!process.env.DB_PASSWORD) {
  console.error('ERROR: DB_PASSWORD not set!');
  process.exit(1);
}
```

---

## Step 6: Rotate Mapbox Token (If Committed to Git) (5 minutes)

### Check if exposed:

```bash
git log --all --full-history -- "client/.env"
```

**If committed:**

1. Go to: https://account.mapbox.com/access-tokens/
2. Create new token with:
   - **Name:** ZoneRush Production
   - **Scopes:** Only necessary permissions (styles:read, fonts:read)
   - **URL Referrers:** Your domain only
3. Copy new token
4. Update `client/.env`:
   ```env
   VITE_MAPBOX_API_KEY=pk.your_new_token_here
   ```
5. Delete old token

---

## Step 7: Verify Security (2 minutes)

### Run secret scanner:

```bash
node server\scripts\scan-secrets.js
```

**Expected output:**
```
🔍 Scanning project for exposed secrets...

📊 Scan Complete: XXX files scanned

✅ No exposed secrets found!
```

### Test database connection:

```bash
test-db-connection.bat
```

**Expected:**
```
✅ Loaded credentials from scripts\.env
✅ Database connection successful!
```

### Test server startup:

```bash
cd server
node server.js
```

**Expected:**
```
✅ Server started in production mode on port 5000
✅ All security checks passed!
```

---

## Step 8: Deploy with Environment Variables

### Vercel (Frontend):

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add:
   ```
   VITE_MAPBOX_API_KEY = pk.your_token_here
   ```

### Render (Backend):

1. Go to: https://render.com/dashboard
2. Select your service
3. Environment tab
4. Add all variables from `server/.env.example`:
   ```
   NODE_ENV = production
   DB_HOST = your-db-host
   DB_USER = your-db-user
   DB_PASSWORD = your-strong-password
   DB_DATABASE = zonerush_production
   JWT_SECRET = your-64-char-secret
   # ... all other API keys
   ```

---

## ✅ Verification Checklist

After completing all steps:

### Secrets:
- [x] Database password changed from "8810"
- [x] JWT_SECRET is 64+ characters (not default)
- [x] All .env files created from .example templates
- [x] No hardcoded passwords in code
- [x] Mapbox token rotated (if exposed)

### Files:
- [x] `server/.env` exists and has real values
- [x] `client/.env` exists and has Mapbox token
- [x] `scripts/.env` exists and has DB password
- [x] All .bat files use `%DB_PASSWORD%`
- [x] All .js scripts use `process.env`

### Git:
- [x] `.gitignore` blocks .env files
- [x] No .env files in repository
- [x] Only .env.example files committed

### Testing:
- [x] Secret scanner passes
- [x] Database connection works
- [x] Server starts without errors
- [x] Frontend loads correctly

---

## 🚨 Common Issues

### Issue: "DB_PASSWORD not set"

**Fix:**
```bash
# Check if .env exists
dir scripts\.env

# If missing, create it
copy scripts\.env.example scripts\.env

# Edit and set password
notepad scripts\.env
```

### Issue: Server won't start in production

**Fix:**
```bash
# Check validation errors
node server\config\securityConfig.js

# Common causes:
# - JWT_SECRET too weak
# - DB_PASSWORD using default
# - Missing FRONTEND_URL
```

### Issue: Mapbox map not loading

**Fix:**
```bash
# Check token in client/.env
type client\.env

# Should show:
# VITE_MAPBOX_API_KEY=pk.your_token_here

# Restart dev server
cd client
npm run dev
```

---

## 📚 Reference Files

| File | Purpose |
|------|---------|
| `SECRET_SECURITY_AUDIT.md` | Complete audit report |
| `server/.env.example` | Backend template |
| `client/.env.example` | Frontend template |
| `scripts/.env.example` | Database scripts template |
| `server/scripts/scan-secrets.js` | Secret scanner |
| `fix-hardcoded-passwords.bat` | Automated .bat fixer |

---

## ⏱️ Time Estimate

| Step | Time |
|------|------|
| Change DB password | 5 min |
| Create .env files | 3 min |
| Generate JWT secret | 1 min |
| Fix .bat files | 2 min |
| Fix .js scripts | 5 min |
| Rotate Mapbox token | 5 min |
| Verify security | 2 min |
| Deploy setup | 5 min |
| **Total** | **~28 minutes** |

---

**Complete all steps before deploying to production!** 🔒
