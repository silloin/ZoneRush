import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import axios from 'axios';

const AdvancedDashboard = ({ userId }) => {
  const [stats, setStats] = useState(null);
  const [paceProgression, setPaceProgression] = useState([]);
  const [distanceProgression, setDistanceProgression] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [weeklyComparison, setWeeklyComparison] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days

  useEffect(() => {
    fetchDashboardData();
  }, [userId, timeRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        paceRes,
        distanceRes,
        heatmapRes,
        weeklyRes,
        aiRes
      ] = await Promise.all([
        axios.get(`/api/runs/user/${userId}/stats`),
        axios.get(`/api/runs/user/${userId}/pace-progression?limit=30`),
        axios.get(`/api/runs/user/${userId}/distance-progression?days=${timeRange}`),
        axios.get(`/api/runs/user/${userId}/heatmap?days=90`),
        axios.get(`/api/runs/user/${userId}/weekly-comparison`),
        axios.get(`/api/ai-coach/recommendations/${userId}`)
      ]);

      setStats(statsRes.data);
      setPaceProgression(paceRes.data);
      setDistanceProgression(distanceRes.data);
      setHeatmapData(heatmapRes.data);
      setWeeklyComparison(weeklyRes.data);
      setAiRecommendations(aiRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const formatDistance = (meters) => (meters / 1000).toFixed(2);
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };
  const formatPace = (pace) => {
    if (!pace) return 'N/A';
    const minutes = Math.floor(pace);
    const seconds = Math.floor((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📊 Performance Dashboard</h1>
          <p className="text-gray-400">Your complete running analytics</p>
        </div>

        {/* AI Recommendations Banner */}
        {aiRecommendations.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🤖</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">AI Coach Recommendations</h3>
                <div className="space-y-2">
                  {aiRecommendations.slice(0, 2).map((rec, index) => (
                    <div key={index} className="bg-white bg-opacity-10 rounded p-3">
                      <p className="font-semibold">{rec.title}</p>
                      <p className="text-sm opacity-90">{rec.description}</p>
                    </div>
                  ))}
                </div>
                <button className="mt-3 text-sm underline hover:text-blue-200">
                  View all recommendations →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon="🏃"
            title="Total Runs"
            value={stats?.total_runs || 0}
            subtitle={`${stats?.weekly?.runs_this_week || 0} this week`}
            trend={calculateTrend(stats?.weekly?.runs_this_week, stats?.weekly?.runs_last_week)}
            color="blue"
          />
          <MetricCard
            icon="📏"
            title="Total Distance"
            value={`${formatDistance(stats?.total_distance || 0)} km`}
            subtitle={`${formatDistance(stats?.weekly?.distance_this_week || 0)} km this week`}
            trend={calculateTrend(stats?.weekly?.distance_this_week, stats?.weekly?.distance_last_week)}
            color="green"
          />
          <MetricCard
            icon="⏱️"
            title="Total Time"
            value={formatDuration(stats?.total_duration || 0)}
            subtitle={formatDuration(stats?.weekly?.duration_this_week || 0) + ' this week'}
            trend={calculateTrend(stats?.weekly?.duration_this_week, stats?.weekly?.duration_last_week)}
            color="purple"
          />
          <MetricCard
            icon="🗺️"
            title="Tiles Captured"
            value={stats?.total_tiles || 0}
            subtitle={`Level ${stats?.level || 1} • ${stats?.xp || 0} XP`}
            color="orange"
          />
        </div>

        {/* Personal Bests */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>🏆</span> Personal Bests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <PersonalBest
              label="Best Pace"
              value={formatPace(stats?.personalBests?.best_pace)}
              unit="/km"
              icon="⚡"
            />
            <PersonalBest
              label="Longest Run"
              value={formatDistance(stats?.personalBests?.longest_distance || 0)}
              unit="km"
              icon="🎯"
            />
            <PersonalBest
              label="Best 5K"
              value={stats?.best_5k_time ? formatDuration(stats.best_5k_time) : 'N/A'}
              unit=""
              icon="🏃"
            />
            <PersonalBest
              label="Current Streak"
              value={stats?.streak || 0}
              unit="days"
              icon="🔥"
            />
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mb-6">
          {['7', '30', '90', '365'].map(days => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                timeRange === days
                  ? 'bg-blue-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {days === '365' ? '1 Year' : `${days} Days`}
            </button>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pace Progression */}
          <ChartCard title="📈 Pace Progression" subtitle="Your pace over time">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={paceProgression}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  reversed
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="pace" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', r: 4 }}
                  name="Pace (min/km)" 
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Distance Progression */}
          <ChartCard title="📊 Distance Progression" subtitle="Daily distance covered">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distanceProgression}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Bar 
                  dataKey="total_distance" 
                  fill="#3B82F6" 
                  name="Distance (m)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Weekly Comparison */}
          <ChartCard title="📅 Weekly Comparison" subtitle="This week vs last week">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weeklyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="day" 
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="thisWeek" 
                  stroke="#8B5CF6" 
                  fill="#8B5CF6"
                  fillOpacity={0.6}
                  name="This Week"
                />
                <Area 
                  type="monotone" 
                  dataKey="lastWeek" 
                  stroke="#6B7280" 
                  fill="#6B7280"
                  fillOpacity={0.3}
                  name="Last Week"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Performance Radar */}
          <ChartCard title="🎯 Performance Profile" subtitle="Multi-dimensional analysis">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={getRadarData(stats)}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="metric" stroke="#9CA3AF" />
                <PolarRadiusAxis stroke="#9CA3AF" />
                <Radar 
                  name="Your Performance" 
                  dataKey="value" 
                  stroke="#F59E0B" 
                  fill="#F59E0B" 
                  fillOpacity={0.6} 
                />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Activity Heatmap */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">🔥 Activity Heatmap (Last 90 Days)</h2>
          <div className="grid grid-cols-7 gap-2">
            {heatmapData.map((day, index) => {
              const intensity = Math.min(day.run_count * 25, 100);
              return (
                <div
                  key={index}
                  className="aspect-square rounded cursor-pointer hover:scale-110 transition"
                  style={{
                    backgroundColor: intensity > 0 
                      ? `rgba(34, 197, 94, ${intensity / 100})` 
                      : '#374151'
                  }}
                  title={`${day.date}: ${day.run_count} runs, ${formatDistance(day.total_distance)} km`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
            <span>Less active</span>
            <div className="flex gap-1">
              {[0, 25, 50, 75, 100].map(intensity => (
                <div
                  key={intensity}
                  className="w-4 h-4 rounded"
                  style={{
                    backgroundColor: intensity > 0 
                      ? `rgba(34, 197, 94, ${intensity / 100})` 
                      : '#374151'
                  }}
                />
              ))}
            </div>
            <span>More active</span>
          </div>
        </div>

        {/* Achievements & Challenges */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">🏅 Recent Achievements</h2>
            <div className="space-y-3">
              {stats?.recentAchievements?.slice(0, 5).map((achievement, index) => (
                <div key={index} className="flex items-center gap-3 bg-gray-700 rounded-lg p-3">
                  <span className="text-3xl">{achievement.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{achievement.name}</p>
                    <p className="text-sm text-gray-400">{achievement.description}</p>
                  </div>
                  <span className="text-yellow-400 font-bold">+{achievement.xp_reward} XP</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">🎯 Active Challenges</h2>
            <div className="space-y-3">
              {stats?.activeChallenges?.slice(0, 5).map((challenge, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold">{challenge.title}</p>
                    <span className="text-sm text-gray-400">
                      {Math.round((challenge.progress / challenge.target) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((challenge.progress / challenge.target) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {challenge.progress.toFixed(1)} / {challenge.target} {challenge.unit}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const MetricCard = ({ icon, title, value, subtitle, trend, color }) => {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-800',
    green: 'from-green-600 to-green-800',
    purple: 'from-purple-600 to-purple-800',
    orange: 'from-orange-600 to-orange-800'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg p-6 hover:scale-105 transition`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-4xl">{icon}</span>
        {trend && (
          <span className={`text-sm font-semibold ${trend > 0 ? 'text-green-300' : 'text-red-300'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <h3 className="text-sm opacity-80 mb-1">{title}</h3>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-sm opacity-70">{subtitle}</p>
    </div>
  );
};

const PersonalBest = ({ label, value, unit, icon }) => (
  <div className="bg-gray-700 rounded-lg p-4 text-center">
    <div className="text-3xl mb-2">{icon}</div>
    <p className="text-gray-400 text-sm mb-1">{label}</p>
    <p className="text-2xl font-bold">
      {value}<span className="text-sm text-gray-400 ml-1">{unit}</span>
    </p>
  </div>
);

const ChartCard = ({ title, subtitle, children }) => (
  <div className="bg-gray-800 rounded-lg p-6">
    <div className="mb-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-gray-400">{subtitle}</p>
    </div>
    {children}
  </div>
);

// Helper Functions
const calculateTrend = (current, previous) => {
  if (!previous || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
};

const getRadarData = (stats) => {
  if (!stats) return [];
  
  return [
    { metric: 'Distance', value: Math.min((stats.total_distance / 100000) * 100, 100) },
    { metric: 'Frequency', value: Math.min((stats.total_runs / 100) * 100, 100) },
    { metric: 'Speed', value: stats.best_pace ? Math.min((6 / stats.best_pace) * 100, 100) : 0 },
    { metric: 'Consistency', value: Math.min((stats.current_streak / 30) * 100, 100) },
    { metric: 'Exploration', value: Math.min((stats.unique_tiles_captured / 500) * 100, 100) }
  ];
};

export default AdvancedDashboard;
