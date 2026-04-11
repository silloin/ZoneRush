# 🔧 Render Build Fix - Quick Guide

## ❌ Problem

You're seeing this error:
```
> vite build
sh: 1: vite: not found
```

---

## ✅ Solution

### **Option 1: Redeploy with Latest Commit (If using Blueprint)**

1. Go to Render Dashboard
2. Click on your **Blueprint**
3. Click **"Apply"** to deploy with latest render.yaml
4. This will use `bash build.sh` automatically

---

### **Option 2: Manually Update Build Command (If created service manually)**

If you created the web service manually (not via Blueprint), you need to update the build command:

1. Go to Render Dashboard
2. Click on your **web service** (zonerush-api)
3. Go to **"Settings"** tab
4. Scroll to **"Build Command"**
5. **Change it to:**
   ```
   bash build.sh
   ```
6. Click **"Save Changes"**
7. Go to **"Manual Deploy"** → **"Deploy latest commit"**

---

### **Option 3: Use Inline Build Command (Alternative)**

If `bash build.sh` doesn't work, use this inline command:

```bash
cd server && npm install --legacy-peer-deps && cd ../client && npm install --legacy-peer-deps && npm run build
```

**How to set it:**
1. Render Dashboard → Your Service → Settings
2. Update **Build Command** to the above
3. Save and redeploy

---

## 📋 What Should Happen

When the build runs correctly, you'll see:

```
🔧 Installing server dependencies...
added 322 packages...

🔧 Installing client dependencies...
added 282 packages...

🏗️ Building client...
> vite build
✓ built in 12.34s
✓ 1234 modules transformed.

✅ Build complete!
```

---

## 🔍 How to Check if Using Blueprint

**Using Blueprint:**
- You have a "Blueprints" section in Render
- Services are linked to render.yaml
- Updates to render.yaml auto-apply on "Apply"

**NOT Using Blueprint:**
- You manually created the web service
- You manually typed the build command
- You need to manually update settings

---

## 🚀 Quick Fix (Recommended)

**Just update the build command in Render dashboard:**

```
bash build.sh
```

Then redeploy!

---

## ❓ Still Not Working?

1. **Check the build.sh file exists:**
   - Go to your GitHub repo
   - Verify `build.sh` is in the root directory
   - It should be there after the latest commit

2. **Check Render is using latest commit:**
   - In Render dashboard, check the commit hash
   - Should be: `a09d26d` (latest)
   - If older, manually deploy latest commit

3. **Try alternative build command:**
   ```bash
   cd server && npm install --legacy-peer-deps && cd ../client && npm install --legacy-peer-deps && npm run build
   ```

---

## 📞 Need Help?

- Check Render logs for detailed error
- Verify build.sh is executable
- Try the alternative inline command above
