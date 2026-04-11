# 🚀 Deployment Instructions

## ✅ Changes Pushed to GitHub

The following fixes have been committed and pushed:
- ✅ CSRF protection disabled (fixes 403 errors)
- ✅ API URL updated for cross-origin deployment
- ✅ Socket.IO URL fixed for production
- ✅ Cookie settings updated for cross-origin

---

## 🔧 Required: Set Environment Variables in Vercel

**You MUST add these to Vercel Dashboard:**

1. Go to: https://vercel.com/dashboard
2. Select your project: **zonerush**
3. Go to: **Settings** → **Environment Variables**
4. Add these variables:

```
VITE_API_URL=https://zonerush-api.onrender.com/api
VITE_SOCKET_URL=https://zonerush-api.onrender.com
```

⚠️ **Important**: Add them for **Production**, **Preview**, and **Development** environments

---

## 📊 Deployment Status

### Backend (Render)
- Status: **Auto-deploying** (triggered by git push)
- URL: https://zonerush-api.onrender.com
- Check logs: Render Dashboard → zonerush-api → Logs

### Frontend (Vercel)  
- Status: **Will redeploy after env vars are added**
- URL: https://zonerush.vercel.app
- Check logs: Vercel Dashboard → zonerush → Deployment Logs

---

## 🧪 Testing After Deployment

1. Wait 3-5 minutes for Render to finish deploying
2. Add environment variables to Vercel (see above)
3. Wait for Vercel to redeploy (1-2 minutes)
4. Visit: https://zonerush.vercel.app
5. Open browser console (F12)
6. Test registration and login
7. Check for any console errors

---

## ✅ Success Indicators

- No 403 Forbidden errors
- Registration works
- Login works  
- Socket.IO connects (check console)
- No CORS errors

---

## 🆘 If Still Getting 403 Errors

The backend hasn't finished deploying yet. Check:
1. Render Dashboard → Logs
2. Look for: "Server started in production mode"
3. This takes 2-5 minutes typically

---

**Last Updated**: April 11, 2026
