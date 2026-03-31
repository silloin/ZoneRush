# 🏃 ZoneRush - Territory Conquest Running Game

<div align="center">
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/PostgreSQL-PostGIS-blue?style=for-the-badge&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Mapbox-GL_JS-black?style=for-the-badge&logo=mapbox" alt="Mapbox">
  <img src="https://img.shields.io/badge/Socket.io-Realtime-white?style=for-the-badge&logo=socket.io" alt="Socket.io">
  <img src="https://img.shields.io/badge/Deployed-Render-purple?style=for-the-badge" alt="Render">
</div>

<div align=\"center\">
  <h3>🎮 Turn your runs into epic territory battles! 🗺️</h3>
  <p><em>Capture zones, compete globally, and level up your running game</em></p>
</div>

---

## 🚀 Features

| Feature | Description | Status |
|---------|-------------|--------|
| 🗺️ Live Territory Map | Real-time GPS tracking with zone capture system | ✅ Active |
| 🔥 Activity Heatmap | Visualize popular running routes in your area | ✅ Active |
| 📊 Performance Dashboard | Comprehensive analytics and progress tracking | ✅ Active |
| 🏆 Achievement System | Unlock badges and level up your profile (XP/levels) | ✅ Active |
| 📈 Global Leaderboard | Compete with runners worldwide | ✅ Active |
| 👥 Multiplayer | See other runners live on the map via Socket.io | ✅ Active |
| 🤖 AI Coach | Personalized training recommendations | ✅ Active |
| 🛡️ Anti-Cheat | Speed and route validation middleware | ✅ Active |
| 📁 GPX Import | Upload runs from Garmin, Strava, etc. | ✅ Active |
| 🏅 Challenges | Join time-limited running challenges | ✅ Active |
| 📱 Mobile Optimized | Responsive UI for all devices | ✅ Active |
| 🆘 SOS Safety System | Emergency location sharing with contacts | ✅ Active |
| 💬 Full Chat System | Private/global chat, friends, clans | ✅ Active |
| 👥 Clans & Social | Team territories and clan competitions | ✅ Active |

---

## 🛠️ Tech Stack

**Frontend**
- React 18 + Vite 5
- Tailwind CSS + clsx/tailwind-merge
- Mapbox GL JS + Mapbox Directions
- Recharts (analytics)
- Socket.io Client 4
- Lucide React (icons)
- Tanstack Query, Framer Motion, react-i18next

**Backend**
- Node.js + Express.js 5
- PostgreSQL + PostGIS (spatial queries)
- Socket.io 4 + Redis Adapter (real-time multiplayer)
- JWT/Jose + Bcrypt (auth)
- Multer (GPX uploads), ngeohash (tiles)
- Firebase Admin (push), Stripe/Twilio (monetization)
- Rate limiting (Redis/express-rate-limit)

**Infrastructure**
- Deployed on Render (PostgreSQL DB)
- Auto DB init (PostGIS schemas)
- Vite PWA plugin (progressive web app)

---

## ⚡ Quick Start

### Prerequisites

```
Node.js 18+
PostgreSQL with PostGIS extension
Mapbox API key (https://mapbox.com)
```

### Installation

**Recommended (Windows - One-click):**
```bash
git clone https://github.com/silloin/ZoneRush.git
cd ZoneRush
setup-everything.bat
```

**Or Manual:**
```bash
npm install  # Root deps + scripts
npm install --prefix server
npm install --prefix client --legacy-peer-deps
```

**Environment Variables**

`server/.env` (create if missing):
```env
DATABASE_URL=postgresql://user:pass@host:5432/zonerush
JWT_SECRET=your_super_secret_jwt_key_here
PORT=5000
NODE_ENV=development
MAPBOX_TOKEN=your_mapbox_pk_here
```

`client/.env`:
```env
VITE_MAPBOX_API_KEY=your_mapbox_pk_here
VITE_API_URL=http://localhost:5000/api
```

### Run the app

**One-command:**
```bash
start.bat
```

**Or Manual:**
```bash
# Backend (auto-inits DB schemas)
cd server && npm run dev

# Frontend (new terminal)
cd client && npm run dev
```

Frontend: `http://localhost:5173` | Backend/API: `http://localhost:5000`

---

## 🗄️ Database Setup

Server **auto-initializes** PostgreSQL + PostGIS on startup:
1. `CREATE EXTENSION postgis`
2. `./sql/postgis_setup.sql` — spatial indexes/functions
3. `./sql/setup_database.sql` — core tables (users/runs/tiles/territories)
4. `./sql/social_gamification.sql` — achievements/XP/leaderboard
5. `./sql/emergency_contacts.sql` / `sos_alerts.sql` — safety
6. `./sql/chat_system.sql` / `clans.sql` — social

**Tables**: users, runs/route_points, tiles/captured_tiles/territories, route_heatmap, achievements/user_achievements, posts/likes/comments, challenges, sos_alerts/emergency_contacts, conversations/messages.

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Register new user | ❌ |
| `POST` | `/api/auth/login` | Login | ❌ |
| `GET/POST` | `/api/runs` | Get/save user runs | ✅ |
| `POST` | `/api/gpx/upload` | GPX import | ✅ |
| `GET` | `/api/tiles` | Captured tiles | ✅ |
| `GET` | `/api/territories` | Territory polygons | ✅ |
| `GET` | `/api/heatmap/bounds` | Heatmap data | ✅ |
| `GET` | `/api/achievements` | Achievements list | ✅ |
| `GET` | `/api/leaderboard` | Global leaderboard | ✅ |
| `GET` | `/api/challenges` | Active challenges | ✅ |
| `GET` | `/api/ai-coach` | AI recommendations | ✅ |
| `GET` | `/api/users/leaderboard` | Users ranking | ✅ |
| `GET/POST` | `/api/social` | Social feed/posts | ✅ |
| `GET` | `/api/segments` | Route segments | ✅ |
| `POST/GET` | `/api/emergency` | SOS/live sharing | ✅ |
| `GET/POST` | `/api/messages` | Chat messages | ✅ |
| `GET/POST` | `/api/friend-requests` | Friends system | ✅ |

**Full routes**: zones/events/training-plans/clans/notifications/safety/monetization/global-chat.

---

## 🎮 How to Play

1. **Register/Login** — Create runner profile
2. **Start Run** — GPS tracking on live map (Mapbox)
3. **Capture Tiles** — Run through geohash grid cells to claim territory
4. **Battle Territories** — Defend vs steal from others (tiles/territories)
5. **Earn XP/Levels** — Achievements, challenges, segments
6. **Social/Compete** — Chat with friends/clans, climb leaderboards
7. **Safety** — SOS button shares live location w/ contacts

**Multiplayer**: See others live via Socket.io, race ghosts, clan wars.

---

## 🚀 Deployment (Render)

Ready via `render.yaml`:
```yaml
services:
  - type: web  # Builds client → server/public, runs server npm start
databases:
  - name: zonerush-db  # PostgreSQL
```

**Env Vars** (Render dashboard):
```
DATABASE_URL  # From Render PostgreSQL
JWT_SECRET    # Generate
NODE_ENV=production
MAPBOX_TOKEN
```

`npm run build` → client build to server/public (Express serves).

---

## 🤝 Contributing

1. Fork repository
2. `git checkout -b feature/amazing-feature`
3. `git commit -m 'feat: add amazing feature'`
4. `git push origin feature/amazing-feature`
5. Open Pull Request

Run `npm run lint` before push. See [TODO.md](TODO.md).

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align=\"center\">
  <sub>Made with ❤️ by the ZoneRush team</sub><br>
  <sub>📧 support@zonerush.com · 💬 <a href=\"https://discord.gg/zonerush\">Discord</a> · 🐦 </sub>
</div>

