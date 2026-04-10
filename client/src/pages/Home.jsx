import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Play, 
  Map as MapIcon, 
  Trophy, 
  Users, 
  Shield, 
  History, 
  TrendingUp, 
  Award,
  Zap,
  Activity,
  Cloud,
  Sun,
  CloudRain,
  Snowflake,
  Wind,
  Droplets,
  Thermometer
} from 'lucide-react';

const Home = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [recentRuns, setRecentRuns] = useState([]);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  const safeRuns = Array.isArray(recentRuns) ? recentRuns : [];

  // Helper functions for weather display
  const getWeatherIcon = (condition) => {
    const icons = {
      Clear: <Sun className="text-yellow-400" size={32} />,
      Clouds: <Cloud className="text-gray-400" size={32} />,
      Rain: <CloudRain className="text-blue-400" size={32} />,
      Snow: <Snowflake className="text-blue-200" size={32} />,
      Thunderstorm: <CloudRain className="text-purple-400" size={32} />,
      Drizzle: <CloudRain className="text-blue-300" size={32} />
    };
    return icons[condition] || <Cloud className="text-gray-400" size={32} />;
  };

  const getAQIColor = (aqi) => {
    if (aqi <= 50) return 'text-green-400';
    if (aqi <= 100) return 'text-yellow-400';
    if (aqi <= 150) return 'text-orange-400';
    if (aqi <= 200) return 'text-red-400';
    return 'text-red-600';
  };

  const getAQILabel = (aqi) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  const getAQIBarColor = (aqi) => {
    if (aqi <= 50) return 'bg-green-500';
    if (aqi <= 100) return 'bg-yellow-500';
    if (aqi <= 150) return 'bg-orange-500';
    if (aqi <= 200) return 'bg-red-500';
    if (aqi <= 300) return 'bg-purple-600';
    return 'bg-red-900';
  };

  useEffect(() => {
  const fetchHomeData = async () => {
    try {
      if (!user?.id) {
        setStats(null);
        setLoading(false);
        return;
      }
      const [statsRes, runsRes] = await Promise.all([
        axios.get(`/users/stats/${user.id}`),
        axios.get('/runs?limit=3')
      ]);
      setStats(statsRes.data);
      const runs = runsRes.data;
      setRecentRuns(Array.isArray(runs) ? runs : (Array.isArray(runs?.runs) ? runs.runs : Array.isArray(runs?.data) ? runs.data : []));
      
      // Fetch weather using geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const weatherRes = await axios.get('/users/weather', {
                params: {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                }
              });
              setWeather(weatherRes.data);
            } catch (err) {
              console.error('Error fetching weather:', err);
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            // Use default location (Dubai) if geolocation fails
            fetchDefaultWeather();
          }
        );
      } else {
        fetchDefaultWeather();
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
      setRecentRuns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaultWeather = async () => {
    try {
      const weatherRes = await axios.get('/users/weather', {
        params: { lat: 25.2048, lng: 55.2708 } // Dubai coordinates
      });
      setWeather(weatherRes.data);
    } catch (err) {
      console.error('Error fetching default weather:', err);
    }
  };

    fetchHomeData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white space-y-8">
      {/* Welcome Section */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Ready for your next territory conquest?</p>
        </div>
        <Link 
          to="/map" 
          className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-2xl transition-all flex items-center gap-3 transform hover:scale-105 active:scale-95"
        >
          <Play fill="white" size={24} />
          START RUN NOW
        </Link>
      </motion.header>

      {/* Quick Stats Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total Distance', value: `${(stats?.total_distance / 1000 || 0).toFixed(2)} km`, icon: <TrendingUp className="text-red-400" />, color: 'from-red-500/10 to-orange-500/10', border: 'border-red-500/30' },
          { label: 'Territories', value: stats?.territories_captured || 0, icon: <MapIcon className="text-orange-400" />, color: 'from-orange-500/10 to-red-500/10', border: 'border-orange-500/30' },
          { label: 'Level', value: user?.level || 1, icon: <Award className="text-red-400" />, color: 'from-red-500/10 to-orange-500/10', border: 'border-red-500/30' },
          { label: 'XP Points', value: user?.xp || 0, icon: <Zap className="text-orange-400" />, color: 'from-orange-500/10 to-red-500/10', border: 'border-orange-500/30' },
        ].map((stat, idx) => (
          <motion.div 
            key={idx} 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            whileHover={{ scale: 1.05, y: -5 }}
            className={`bg-gradient-to-br ${stat.color} border ${stat.border} p-4 rounded-2xl flex items-center gap-4 shadow-lg`}
          >
            <div className="p-3 bg-gray-900/50 rounded-xl">{stat.icon}</div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* New Features Highlights */}
          <motion.section 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-500/30 p-6 rounded-3xl"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Zap className="text-orange-400" size={20} />
              New in ZoneRush
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gray-900/60 p-4 rounded-2xl border border-gray-700"
              >
                <Users className="text-red-400 mb-2" size={24} />
                <h3 className="font-bold text-sm">Live Multiplayer</h3>
                <p className="text-gray-400 text-xs mt-1">See other runners live on the map and compete in real-time.</p>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gray-900/60 p-4 rounded-2xl border border-gray-700"
              >
                <Shield className="text-orange-400 mb-2" size={24} />
                <h3 className="font-bold text-sm">Smart Safety</h3>
                <p className="text-gray-400 text-xs mt-1">AI-powered safety checks and instant SOS for your peace of mind.</p>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gray-900/60 p-4 rounded-2xl border border-gray-700"
              >
                <MapIcon className="text-red-400 mb-2" size={24} />
                <h3 className="font-bold text-sm">Territory War</h3>
                <p className="text-gray-400 text-xs mt-1">Capture areas and defend them from other runners in your city.</p>
              </motion.div>
            </div>
          </motion.section>

          {/* Recent Runs */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History className="text-gray-400" size={20} />
                Recent Runs
              </h2>
              <Link to="/runs" className="text-orange-400 hover:text-red-400 text-sm font-medium transition">View All</Link>
            </div>
            <div className="space-y-3">
              {safeRuns.length > 0 ? (
                safeRuns.map((run) => (
                  <div key={run.id} className="bg-gray-800/40 hover:bg-gray-800/60 transition border border-gray-700/50 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-full flex items-center justify-center text-orange-500 border border-orange-500/30">
                        <Activity size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold">{new Date(run.completed_at).toLocaleDateString()}</h4>
                        <p className="text-gray-400 text-xs">{(run.distance / 1000).toFixed(2)} km • {Math.floor(run.duration / 60)}m {run.duration % 60}s</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-400">{Number(run.pace)?.toFixed(2) ?? 'N/A'} min/km</p>
                      <p className="text-gray-500 text-[10px] uppercase tracking-tighter font-bold">min/km</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-gray-800/20 rounded-2xl border border-dashed border-gray-700">
                  <p className="text-gray-500">No runs yet. Get out there and start running!</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar / Leaderboard Preview */}
        <div className="space-y-8">
          {/* Weather Widget */}
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-gradient-to-br from-orange-900/30 to-red-900/30 border border-orange-500/30 p-6 rounded-3xl"
          >
              {!weather ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Loading weather...</p>
                </div>
              ) : (
              <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Thermometer className="text-blue-400" size={20} />
                    Current Weather
                  </h2>
                  {weather.weather?.location && (
                    <p className="text-xs text-gray-400 mt-1">
                      📍 {weather.weather.location.city}, {weather.weather.location.country}
                    </p>
                  )}
                </div>
                {getWeatherIcon(weather.weather?.condition)}
              </div>
              
                {/* Temperature */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Temperature</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold">{Math.round(weather.weather?.temp || 0)}°C</span>
                    {weather.weather?.feels_like && (
                      <p className="text-xs text-gray-500">Feels like {Math.round(weather.weather.feels_like)}°C</p>
                    )}
                  </div>
                </div>
                
                {/* Condition */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Condition</span>
                  <span className="font-semibold capitalize">{weather.weather?.description || weather.weather?.condition}</span>
                </div>
                
                {/* Humidity */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Droplets size={16} />
                    Humidity
                  </div>
                  <span className="font-semibold">{weather.weather?.humidity}%</span>
                </div>
                
                {/* Wind Speed */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Wind size={16} />
                    Wind
                  </div>
                  <span className="font-semibold">{weather.weather?.windSpeed} m/s</span>
                </div>

                {/* Visibility & Pressure */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {weather.weather?.visibility && (
                    <div className="bg-gray-800/50 p-2 rounded-lg">
                      <p className="text-xs text-gray-500">Visibility</p>
                      <p className="font-semibold text-sm">{weather.weather.visibility} km</p>
                    </div>
                  )}
                  {weather.weather?.pressure && (
                    <div className="bg-gray-800/50 p-2 rounded-lg">
                      <p className="text-xs text-gray-500">Pressure</p>
                      <p className="font-semibold text-sm">{weather.weather.pressure} hPa</p>
                    </div>
                  )}
                </div>
                
                {/* Air Quality Index */}
                <div className="pt-3 border-t border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Air Quality Index (AQI)</span>
                    <div className="text-right">
                      <span className={`font-bold text-lg ${getAQIColor(weather.weather?.aqi)}`}>
                        {weather.weather?.aqi}
                      </span>
                      <p className={`text-xs ${getAQIColor(weather.weather?.aqi)}`}>
                        {getAQILabel(weather.weather?.aqi)}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all ${getAQIBarColor(weather.weather?.aqi)}`}
                      style={{ width: `${Math.min(((weather.weather?.aqi || 0) / 500) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500">0</p>
                    <p className="text-xs text-gray-500">500+</p>
                  </div>
                  {weather.weather?.aqiSource && (
                    <p className="text-xs text-gray-600 mt-1 text-center">
                      Source: {weather.weather.aqiSource}
                    </p>
                  )}
                </div>
                
                {/* Training Recommendation */}
                {weather.recommendation?.recommendations?.length > 0 && (
                  <div className={`p-3 rounded-xl mt-3 ${
                    weather.recommendation.canRun ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30'
                  }`}>
                    <p className={`text-xs font-bold mb-2 ${
                      weather.recommendation.canRun ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {weather.recommendation.canRun ? '✓ Good for Running' : '⚠ Caution Advised'}
                    </p>
                    <ul className="space-y-1">
                      {weather.recommendation.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-xs text-gray-300">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              )}
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-orange-500/30 p-6 rounded-3xl h-fit"
          >
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="text-yellow-400" size={24} />
              <h2 className="text-xl font-bold">Top Runners</h2>
            </div>
            {/* Quick leaderboard list could go here */}
            <div className="space-y-4">
              <p className="text-gray-500 text-sm italic">Connect with others to see your ranking among friends.</p>
              <Link to="/leaderboard" className="block w-full text-center py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-xl font-bold transition shadow-lg hover:shadow-xl transform hover:scale-105">
                Full Leaderboard
              </Link>
            </div>
          </motion.section>

          {/* Training Tip */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-r from-red-600 to-orange-600 p-6 rounded-3xl text-white relative overflow-hidden group shadow-2xl"
          >
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2">Pro Tip</h3>
              <p className="text-blue-100 text-sm">Run through new areas to capture territories and earn 2x XP points today!</p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
              <TrendingUp size={120} />
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
};

export default Home;