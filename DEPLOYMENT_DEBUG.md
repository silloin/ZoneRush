# Deployment Debug Guide - Render + Vercel + Supabase

## Common Issues & Solutions

### 1. Backend (Render) Issues

#### Environment Variables Required on Render:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname?sslmode=require

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Email (if using notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# External APIs
VITE_MAPBOX_API_KEY=your-mapbox-api-key
```

#### Render Build Command:
```bash
npm install
```

#### Render Start Command:
```bash
npm start
```

### 2. Frontend (Vercel) Issues

#### Environment Variables Required on Vercel:
```bash
VITE_API_URL=https://your-app-name.onrender.com
VITE_MAPBOX_API_KEY=your-mapbox-api-key
```

#### Vercel Build Settings:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

### 3. Database (Supabase) Issues

#### Required Supabase Settings:
1. **Enable PostGIS Extension**
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

2. **Update Connection String**
   - Get from Supabase Dashboard > Settings > Database
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`

3. **Run Database Migrations**
   - Execute all SQL files from `/server/sql/` directory in order

### 4. CORS Issues

#### Add this to your backend (server.js):
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-app-name.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token']
}));
```

### 5. Socket.io Issues

#### Update server.js for Render:
```javascript
const io = require('socket.io')(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://your-app-name.vercel.app'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

### 6. Common Error Messages & Solutions

#### "Database connection failed"
- Check DATABASE_URL format
- Ensure SSL is enabled
- Verify Supabase credentials

#### "CORS policy error"
- Update CORS origins in backend
- Add Vercel domain to allowed origins

#### "Socket.io connection failed"
- Check CORS settings for Socket.io
- Ensure WebSocket is enabled on Render

#### "JWT token invalid"
- Check JWT_SECRET is set on Render
- Ensure token is being sent from frontend

### 7. Testing Checklist

1. **Backend Health Check**
   ```bash
   curl https://your-app-name.onrender.com/api/health
   ```

2. **Database Connection**
   - Check Render logs for database errors
   - Test connection manually

3. **Frontend API Calls**
   - Open browser dev tools
   - Check Network tab for failed requests

4. **Socket.io Connection**
   - Check browser console for socket errors
   - Verify WebSocket handshake

### 8. Port Forwarding Issues

#### Update client API URL detection:
```javascript
// In client/src/context/AuthContext.jsx
const getApiUrl = () => {
  if (import.meta.env.PROD) {
    // For Vercel deployment
    return import.meta.env.VITE_API_URL || 'https://your-app-name.onrender.com';
  }
  return '/api';
};
```

### 9. Build Issues

#### Remove client build from server package.json:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### 10. Static File Serving

#### Ensure backend serves static files:
```javascript
// In server.js
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}
```

## Quick Fix Steps

1. **Set Environment Variables** on Render and Vercel
2. **Update CORS origins** in backend
3. **Test database connection** manually
4. **Check build logs** on both platforms
5. **Verify API endpoints** are accessible
6. **Test Socket.io connection**

## Debug Commands

```bash
# Test backend
curl -X GET https://your-app-name.onrender.com/api/users

# Test database connection
psql "postgresql://user:pass@host:port/dbname?sslmode=require"

# Check frontend build
npm run build
npm run preview
```
