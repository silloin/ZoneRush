# Deploy ZoneRush with Supabase + Vercel

## Architecture
- **Backend**: Render (Node.js + Express)
- **Database**: Supabase (PostgreSQL)
- **Frontend**: Vercel (React + Vite)

## Step 1: Setup Supabase Database

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > Database
3. Copy the **Connection string**
4. Run the database schema:
   ```bash
   # In your Supabase SQL Editor
   # Copy contents from database/complete_schema.sql
   ```

## Step 2: Deploy Backend to Render

1. Update `render.yaml` (already configured for Supabase)
2. In Render dashboard, add these environment variables:
   ```bash
   DATABASE_URL=postgresql://user:pass@host:5432/postgres
   NODE_ENV=production
   JWT_SECRET=your_secret_key_here
   WEATHER_API_KEY=your_weather_key
   AQI_API_KEY=your_aqi_key
   GROQ_API_KEY=your_groq_key
   EMAIL_SERVICE=gmail
   EMAIL_USER=your_email@gmail.com
   EMAIL_APP_PASSWORD=your_app_password
   MAPBOX_API_KEY=your_mapbox_key
   ```

3. Deploy to Render
4. Note your Render URL: `https://your-app.onrender.com`

## Step 3: Deploy Frontend to Vercel

1. In Vercel dashboard, add these environment variables:
   ```bash
   VITE_API_URL=https://your-app.onrender.com/api
   VITE_SOCKET_URL=https://your-app.onrender.com
   VITE_MAPBOX_API_KEY=your_mapbox_key
   ```

2. Connect your GitHub repo to Vercel
3. Deploy

## Step 4: Update CORS Settings

In your Render backend environment variables:
- Set `FRONTEND_URL=https://your-vercel-app.vercel.app`
- Set `CORS_ORIGIN=https://your-vercel-app.vercel.app`

## Verification

Test these endpoints:
- Backend: `https://your-app.onrender.com/api/health`
- Frontend: `https://your-vercel-app.vercel.app`
- Email test: `POST https://your-app.onrender.com/api/email-test/test-email`

## Troubleshooting

### CORS Issues
Add your Vercel URL to Render CORS settings.

### Database Connection
Ensure Supabase connection string is correct and SSL is enabled.

### Socket.IO Connection
Verify `VITE_SOCKET_URL` matches your Render backend URL (without `/api`).
