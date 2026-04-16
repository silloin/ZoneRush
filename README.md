# 🏃‍♂️ ZoneRush - Real-Time GPS Territory Capture Game

**ZoneRush** is a modern, real-time multiplayer fitness game that turns running into an exciting territory conquest experience. Capture zones, compete with other runners, track your progress, chat with friends, and stay safe with AI-powered features.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-14+-blue.svg)
![React](https://img.shields.io/badge/react-18+-61dafb.svg)

---

## ✨ Features

### 🗺️ **Live Territory Capture**
- Real-time GPS tracking with Mapbox integration
- Capture and defend territories as you run
- See other runners live on the map
- Territory battle system with real-time updates

### 🏆 **Gamification & Competition**
- XP points and level progression system
- Global and friend leaderboards
- **Weekly achievements** with auto-reset every Monday
- Weekly challenges and events
- Clan system for team competition

### 🤖 **AI-Powered Features**
- AI Running Coach for personalized training advice
- Smart safety checks during runs
- Weather-based training recommendations
- Air quality monitoring for safe outdoor runs

### 💬 **Social & Communication**
- **Modern chat interface** with real-time private messaging
- Global chat for community interaction
- Friend requests and social feed
- Activity sharing and kudos system
- **Smart message grouping** with avatars
- **Emoji picker** integration

### 🆘 **Safety First**
- SOS emergency alerts with live location sharing
- Emergency contact management
- Real-time location sharing with trusted contacts
- AI safety monitoring during runs
- **Email notifications** for SOS alerts

### 📊 **Advanced Analytics**
- Run history with detailed statistics
- Route tracking with GPX support
- Performance insights and pace analysis
- Heatmap visualization of popular routes
- Territory capture statistics

### 🎨 **User Experience**
- **Responsive design** - Works on mobile, tablet, and desktop
- **Skeleton loading** - Smooth loading animations
- **Modern UI** - Gradient backgrounds, smooth animations
- **Dark theme** - Easy on the eyes
- **Mobile-optimized** - Touch-friendly navigation

---

## 🚀 Getting Started

### Quick Start (Windows)

```bash
# Just run this script - it handles everything!
start-dev.bat
```

This will:
1. Install dependencies (if needed)
2. Start backend server (port 5000)
3. Start frontend server (port 5173)
4. Open browser automatically

### Manual Setup

### Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher) with **PostGIS** extension
- **Mapbox API Key** (get from [mapbox.com](https://www.mapbox.com))
- **npm** or **yarn**

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/zonerush.git
cd zonerush
```

2. **Install dependencies**
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. **Set up PostgreSQL database**
```bash
# Create database
createdb zonerush

# Enable PostGIS extension
psql -d zonerush -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run database migrations
psql -d zonerush -f database/complete_schema.sql
```

4. **Configure environment variables**

**Server (.env)** - Create in `/server` directory:
```env
# PostgreSQL Connection
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_DATABASE=zonerush
DB_PORT=5432

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here

# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Mapbox API
MAPBOX_API_KEY=your_mapbox_api_key

# Weather API (OpenWeatherMap)
WEATHER_API_KEY=your_weather_api_key

# Air Quality API (WAQI)
AQI_API_KEY=your_aqi_api_key

# Email Configuration (Resend)
EMAIL_SERVICE=resend
RESEND_API_KEY=your_resend_api_key
RESEND_VERIFIED_EMAIL=your_verified_email@example.com

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

**Client (.env)** - Create in `/client` directory:
```env
VITE_MAPBOX_API_KEY=your_mapbox_api_key
```

5. **Start the application**
```bash
# From the root directory
# Terminal 1 - Start backend server
cd server
npm run dev

# Terminal 2 - Start frontend
cd client
npm run dev
```

6. **Open your browser**
Navigate to `http://localhost:5173`

---

## 🌐 Deployment

### Deploy to Render (Free)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Render**
   - Go to [render.com](https://render.com)
   - Click **New +** → **Blueprint**
   - Connect your GitHub repo
   - Render auto-detects `render.yaml`
   - Click **Apply**

3. **Add Environment Variables**
   In Render dashboard, add:
   ```
   WEATHER_API_KEY=your_key
   AQI_API_KEY=your_key
   GROQ_API_KEY=your_key
   EMAIL_SERVICE=resend
   RESEND_API_KEY=your_resend_key
   RESEND_VERIFIED_EMAIL=your_verified_email
   ```

4. **Done!** 🎉
   Your app will be live at: `https://zonerush.onrender.com`

📖 **Full Deployment Guide:** See [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 📱 Features Overview

### Map Interface
- **Live Tracking**: Real-time GPS location updates
- **Territory Visualization**: See captured zones in real-time
- **Multiplayer View**: Watch other runners on the map
- **Heatmap**: View popular running routes
- **Route Planning**: Get directions with Mapbox

### Run Tracking
- **Start/Stop Runs**: Track your running sessions
- **Live Statistics**: Distance, pace, duration, tiles captured
- **Route Recording**: GPS route with accuracy filtering
- **Auto-Save**: Runs automatically saved to database

### Social Features
- **Private Chat**: Modern messaging interface with real-time updates
  - Smart message grouping with avatars
  - Emoji picker integration
  - Message delete functionality
  - Online status indicators
  - Responsive mobile design
- **Global Chat**: Community-wide communication
- **Friend System**: Add and manage friends
- **Activity Feed**: Share and view running activities

### Safety & Emergency
- **SOS Button**: Instant emergency alerts
- **Live Location Sharing**: Real-time tracking for emergencies
- **Emergency Contacts**: Manage your safety network
- **WhatsApp Integration**: Quick contact via WhatsApp

---

## 🛠️ Tech Stack

### How It Works (Local vs Production)

**Development Mode:**
- Frontend: `http://localhost:5173` (Vite dev server)
- Backend: `http://localhost:5000` (Express)
- Vite proxies `/api` requests to backend automatically
- Socket.IO connects to `localhost:5000`

**Production Mode:**
- Frontend & Backend: Same domain (e.g., `zonerush.onrender.com`)
- API calls use relative URLs (`/api`)
- Socket.IO uses `window.location.origin`
- No CORS issues!

### Smart Configuration

The app automatically detects the environment:
- ✅ Works on localhost without changes
- ✅ Works in production without code changes
- ✅ No hardcoded URLs
- ✅ Environment variables handled automatically

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Mapbox GL** - Interactive maps
- **Socket.IO Client** - Real-time communication
- **Framer Motion** - Smooth animations
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **React Router** - Client-side routing

### Backend
- **Node.js** - Runtime environment
- **Express 5** - Web framework
- **Socket.IO** - Real-time bidirectional communication
- **PostgreSQL** - Relational database
- **PostGIS** - Spatial database extension
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Nodemailer** - Email service

### Services & APIs
- **Mapbox** - Maps and geocoding
- **OpenWeatherMap** - Weather data
- **WAQI** - Air quality index
- **Groq AI** - AI coach integration
- **Resend** - Email service (SOS alerts, verification)
- **Firebase** - Push notifications (optional)

---

## 📊 Database Schema

The application uses PostgreSQL with PostGIS for spatial data:

**Core Tables:**
- `users` - User accounts and profiles
- `runs` - Running sessions with route geometry
- `tiles` - Territory tiles with spatial data
- `territories` - Captured territories
- `messages` - Private chat messages
- `global_messages` - Global chat
- `friend_requests` - Friend connections
- `notifications` - User notifications
- `sos_alerts` - Emergency alerts
- `achievements` - User achievements (with weekly reset support)
- `training_plans` - AI-generated training plans
- `system_logs` - System activity logging

**Spatial Columns (SRID: 4326):**
- Route geometries (LINESTRING)
- Location points (POINT)
- Tile polygons (POLYGON)
- Territory areas (POLYGON)

---

## 🎮 How to Play

1. **Register** an account or login
2. **Start a run** from the map page
3. **Run around** your area to capture tiles
4. **Compete** with other runners for territories
5. **Level up** by earning XP points
6. **Join clans** and participate in team challenges
7. **Check leaderboards** to see your ranking
8. **Chat** with other runners in real-time
9. **Unlock achievements** - Weekly achievements reset every Monday!
10. **Stay safe** with SOS and emergency contacts
11. **Customize your profile** with profile pictures

---

## 🔧 Development

### Project Structure
```
zonerush/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   │   ├── Chat/     # Chat interface components
│   │   │   ├── Avatar.jsx # Profile avatar component
│   │   │   └── Skeleton.jsx # Loading skeleton component
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context (Auth, Socket)
│   │   ├── services/      # API services
│   │   └── hooks/         # Custom hooks
│   └── package.json
├── server/                # Express backend
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   │   ├── emailService.js # Centralized email service
│   │   └── achievementService.js # Achievement management
│   ├── middleware/       # Auth, validation, etc.
│   ├── config/           # Database config
│   └── package.json
├── database/             # SQL migrations and schemas
└── README.md
```

### Available Scripts

**Client:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

**Server:**
```bash
npm run dev          # Start with nodemon (auto-reload)
npm start            # Start production server
npm test             # Run tests
```

---

## 🚀 Deployment

### Backend (Railway/Render/Heroku)
1. Set up PostgreSQL add-on
2. Configure environment variables
3. Deploy server code
4. Run database migrations

### Frontend (Vercel/Netlify)
1. Build the client: `npm run build`
2. Deploy the `client/dist` folder
3. Set environment variables
4. Configure API base URL

---

## 📝 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth` - Get current user (protected)

### Runs
- `POST /api/runs` - Save a run
- `GET /api/runs` - Get user's runs
- `GET /api/runs/:id` - Get specific run

### Tiles & Territories
- `GET /api/tiles` - Get all tiles
- `GET /api/tiles/count/:userId` - Get user's tile count
- `GET /api/territories` - Get territories

### Social
- `GET /api/messages/conversations` - Get chat conversations
- `POST /api/messages/:userId` - Send message
- `GET /api/friends/list` - Get friends list
- `POST /api/friends/request` - Send friend request

### Achievements
- `GET /api/achievements` - Get all achievements
- `GET /api/achievements/user/:userId` - Get user's achievements
- `GET /api/achievements/user/:userId/progress` - Get achievement progress
- `POST /api/achievements/reset-weekly` - Reset weekly achievements (admin)

### AI Coach
- `GET /api/ai-coach/recommendations/:userId` - Get recommendations
- `POST /api/ai-coach/ask` - Ask AI coach a question

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Mapbox** for the amazing mapping platform
- **OpenStreetMap** contributors for map data
- **OpenWeatherMap** for weather data
- **WAQI** for air quality data
- **PostGIS** for spatial database capabilities
- **Resend** for email delivery service
- **Groq AI** for AI coach capabilities
- All contributors and testers

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/zonerush/issues)
- **Email**: your-email@example.com
- **Documentation**: [Wiki](https://github.com/yourusername/zonerush/wiki)

---

## 🌟 Show Your Support

Give a ⭐️ if this project helped you!

---

**Built with ❤️ for runners everywhere** 🏃‍♂️💨

---

## 🆕 Recent Updates

### Latest Features (2026)
- ✅ **Modern Chat Interface** - Redesigned messaging with smart grouping, avatars, and emoji support
- ✅ **Weekly Achievements** - Auto-reset system for weekly challenges
- ✅ **Skeleton Loading** - Smooth loading animations across all pages
- ✅ **Responsive Design** - Fully optimized for mobile, tablet, and desktop
- ✅ **Email Service Migration** - Switched to Resend for reliable email delivery
- ✅ **Profile Avatars** - Automatic first-letter fallback for missing profile pictures
- ✅ **Enhanced UI** - Gradient backgrounds, smooth animations, and better UX
- ✅ **Sidebar Navigation** - Improved navigation with left-aligned desktop menu
- ✅ **Message Input Fix** - Always-visible input field with better styling
- ✅ **Safety Improvements** - Email notifications for SOS alerts
