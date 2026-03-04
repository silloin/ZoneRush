# Setup Guide

Complete installation and configuration instructions for RunTerra.

## Prerequisites

Before starting, ensure you have:

- **Node.js** 16.0 or higher ([Download](https://nodejs.org/))
- **npm** 7.0+ (comes with Node.js)
- **PostgreSQL** 12 or higher ([Download](https://www.postgresql.org/download/))
- **Git** for version control ([Download](https://git-scm.com/))

Verify installations:
```bash
node --version    # v16.0.0 or higher
npm --version     # 7.0.0 or higher
psql --version    # PostgreSQL 12.0 or higher
git --version     # git version 2.30+
```

---

## Database Setup

### 1. Create PostgreSQL Database

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# In PostgreSQL shell:
CREATE DATABASE runterra;
CREATE USER runterra_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE runterra TO runterra_user;
```

### 2. Enable PostGIS Extension

```bash
# Connect to the runterra database
psql -U postgres -d runterra

# In PostgreSQL shell:
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

# Verify installation
SELECT postgis_version();
```

### 3. Initialize Database Schema

```bash
# From server directory
psql -U runterra_user -d runterra -f sql/create_tables.sql
```

Verify tables created:
```bash
psql -U runterra_user -d runterra -c "\dt"
```

You should see:
- public.users
- public.runs
- public.tiles
- public.zones
- public.events
- public.training_plans

---

## Backend Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

Expected packages (10 dependencies):
- bcryptjs - Password hashing
- cors - Cross-origin requests
- dotenv - Environment variables
- express - Web framework
- jsonwebtoken - JWT auth
- multer - File uploads
- ngeohash - Geohashing
- pg - PostgreSQL driver
- socket.io - Real-time events
- xml2js - GPX parsing

### 2. Configure Environment Variables

Create `server/.env` file:

```env
# Database Configuration
DB_USER=runterra_user
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_DATABASE=runterra
DB_PORT=5432

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Security (optional)
CORS_ORIGIN=http://localhost:5173
```

### 3. Verify Database Connection

Create `test-db.js`:
```javascript
const pool = require('./config/db');

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database Error:', err);
  } else {
    console.log('Database Connected:', res.rows[0]);
  }
  process.exit(0);
});
```

Run verification:
```bash
node test-db.js
# Output: Database Connected: { now: 2026-03-04T10:30:00Z }
```

### 4. Start Backend Server

**Development with auto-reload:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server will be available at `http://localhost:5000`

Expected logs:
```
Server started on port 5000
Database connected on 2026-03-04 10:30:00
```

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd client
npm install
```

### 2. Configure Environment Variables

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 3. Obtain Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable Maps JavaScript API
4. Create API key (restrict to your domain)
5. Add key to `.env`

### 4. Start Development Server

```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

---

## Testing the Setup

### 1. Backend API Test

```bash
# Test server health
curl http://localhost:5000

# Test user registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123"
  }'

# Response
{"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

### 2. Database Connection Test

```bash
# Connect to database
psql -U runterra_user -d runterra

# List tables
\dt

# Check PostGIS
SELECT postgis_version();

# Sample query
SELECT COUNT(*) FROM users;
```

### 3. Frontend Health Check

Visit `http://localhost:5173` in browser. You should see:
- RunTerra home page
- Map visualization (if Google Maps API configured)
- No console errors

---

## Common Issues & Solutions

### Issue: "Cannot find module 'pg'"
**Solution:**
```bash
cd server
npm install pg
```

### Issue: "ECONNREFUSED" on database connection
**Solution:**
1. Verify PostgreSQL is running
2. Check credentials in `.env`
3. Confirm database exists: `psql -l`
4. Test connection: `psql -U runterra_user -d runterra`

### Issue: "Database extension postgis not found"
**Solution:**
```bash
psql -U postgres -d runterra
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Issue: Port 5000 already in use
**Solution:**
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port
PORT=5001 npm start
```

### Issue: Module not found errors
**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: CORS errors in browser console
**Solution:**
1. Verify `CORS_ORIGIN` in `.env`
2. Check backend is running
3. Verify API URL in client `.env`

---

## Docker Setup (Optional)

### Create `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_USER: runterra_user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: runterra
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  server:
    build: ./server
    environment:
      DB_USER: runterra_user
      DB_PASSWORD: password
      DB_HOST: postgres
      DB_DATABASE: runterra
      DB_PORT: 5432
      JWT_SECRET: your_secret
      PORT: 5000
    ports:
      - "5000:5000"
    depends_on:
      - postgres

volumes:
  pgdata:
```

Run with Docker:
```bash
docker-compose up
```

---

## Production Deployment

### 1. Environment Setup
```env
NODE_ENV=production
PORT=5000
DB_HOST=prod-db-server
DB_USER=prod_user
DB_PASSWORD=strong_password
JWT_SECRET=very_long_random_secret_key
CORS_ORIGIN=https://yourdomain.com
```

### 2. Database Backups
```bash
# Backup database
pg_dump -U runterra_user -d runterra > backup.sql

# Restore from backup
psql -U runterra_user -d runterra < backup.sql
```

### 3. Process Management
Use PM2 for process management:
```bash
npm install -g pm2
pm2 start server.js --name "runterra-server"
pm2 save
pm2 startup
```

### 4. SSL/HTTPS
Configure reverse proxy (nginx):
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Next Steps

1. ✅ Database configured
2. ✅ Backend running
3. ✅ Frontend running
4. → Review [API Documentation](./API.md)
5. → Check [Architecture Guide](./ARCHITECTURE.md)
6. → Start developing!

---

**Setup Version**: 1.0.0
**Last Updated**: March 2026
