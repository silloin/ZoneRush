# RunTerra - Realtime Location Tracker

A gamified running app that turns your runs into territory conquest adventures. Capture tiles, compete with friends, and track your progress in real-time.

## Features

🗺️ **Live Map Tracking** - Real-time GPS tracking with tile-based territory system  
📊 **Dashboard** - Comprehensive running statistics and performance analytics  
🏆 **Achievements** - Unlock badges and level up your running profile  
📈 **Leaderboard** - Compete globally with other runners  
👥 **Social Feed** - Share runs and connect with the running community  
📱 **Mobile Responsive** - Optimized for all devices  

## Tech Stack

**Frontend:**
- React 18
- Tailwind CSS
- Recharts (data visualization)
- Mapbox GL JS
- Lucide React (icons)

**Backend:**
- Node.js
- Express.js
- PostgreSQL
- JWT Authentication

## Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL
- Mapbox API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/realtime-location-tracker.git
cd realtime-location-tracker
```

2. **Install dependencies**
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

3. **Environment Setup**
```bash
# Server .env
DATABASE_URL=postgresql://username:password@localhost:5432/runterra
JWT_SECRET=your_jwt_secret
PORT=5000

# Client .env
REACT_APP_MAPBOX_TOKEN=your_mapbox_token
```

4. **Database Setup**
```bash
cd server
npm run migrate
```

5. **Start the application**
```bash
# Backend (port 5000)
cd server
npm start

# Frontend (port 3000)
cd client
npm start
```

## Usage

1. **Register/Login** - Create your runner profile
2. **Upload GPX** - Import your running data from fitness apps
3. **View Dashboard** - Track your progress and statistics
4. **Explore Map** - See captured territories and plan routes
5. **Compete** - Check leaderboards and unlock achievements

## API Endpoints

```
POST /auth/register     - User registration
POST /auth/login        - User authentication
GET  /runs              - Get user runs
POST /gpx/upload        - Upload GPX files
GET  /achievements      - Get achievements
GET  /users/leaderboard - Global leaderboard
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For support, email support@runterra.com or join our Discord community.