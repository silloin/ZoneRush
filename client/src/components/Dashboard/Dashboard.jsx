import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const Dashboard = ({ userId }) => {
  const [stats, setStats] = useState(null);
  const [paceProgression, setPaceProgression] = useState([]);
  const [distanceProgression, setDistanceProgression] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [userId]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, paceRes, distanceRes, heatmapRes] = await Promise.all([
        axios.get(`/api/runs/user/${userId}/stats`),
        axios.get(`/api/runs/user/${userId}/pace-progression?limit=20`),
        axios.get(`/api/runs/user/${userId}/distance-progression?days=30`),
        axios.get(`/api/runs/user/${userId}/heatmap?days=90`)
      ]);

      setStats(statsRes.data);
      setPaceProgression(paceRes.data);
      setDistanceProgression(distanceRes.data);
      setHeatmapData(heatmapRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const formatDistance = (meters) => {
    return (meters / 1000).toFixed(2);
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatPace = (pace) => {
    if (!pace) return 'N/A';
    const minutes = Math.floor(pace);
    const seconds = Math.floor((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">📊 Dashboard</h1>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon="🏃"
            title="Total Runs"
            value={stats?.total_runs || 0}
            subtitle={`${stats?.weekly?.runs_this_week || 0} this week`}
          />
          <StatCard
            icon="📏"
            title="Total Distance"
            value={`${formatDistance(stats?.total_distance || 0)} km`}
            subtitle={`${formatDistance(stats?.weekly?.distance_this_week || 0)} km this week`}
          />
          <StatCard
            icon="⏱️"
            title="Total Time"
            value={formatDuration(stats?.total_duration || 0)}
            subtitle={formatDuration(stats?.weekly?.duration_this_week || 0) + ' this week'}
          />
          <StatCard
            icon="🗺️"
            title="Tiles Captured"
            value={stats?.total_tiles_captured || 0}
            subtitle={`Level ${stats?.level || 1}`}
          />
        </div>

        {/* Personal Bests */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">🏆 Personal Bests</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Best Pace</p>
              <p className="text-2xl font-bold text-green-400">
                {formatPace(stats?.personalBests?.best_pace)}
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Longest Run</p>
              <p className="text-2xl font-bold text-blue-400">
                {formatDistance(stats?.personalBests?.longest_distance || 0)} km
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Current Streak</p>
              <p className="text-2xl font-bold text-orange-400">
                {stats?.current_streak || 0} days 🔥
              </p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pace Progression */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">📈 Pace Progression</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={paceProgression}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Line type="monotone" dataKey="pace" stroke="#10B981" strokeWidth={2} name="Pace (min/km)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distance Progression */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">📊 Distance (Last 30 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distanceProgression}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Bar dataKey="total_distance" fill="#3B82F6" name="Distance (m)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">🔥 Activity Heatmap (Last 90 Days)</h2>
          <div className="grid grid-cols-7 gap-2">
            {heatmapData.map((day, index) => {
              const intensity = Math.min(day.run_count * 25, 100);
              return (
                <div
                  key={index}
                  className="aspect-square rounded"
                  style={{
                    backgroundColor: intensity > 0 ? `rgba(34, 197, 94, ${intensity / 100})` : '#374151'
                  }}
                  title={`${day.date}: ${day.run_count} runs`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, subtitle }) => (
  <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition">
    <div className="flex items-center justify-between mb-2">
      <span className="text-3xl">{icon}</span>
    </div>
    <h3 className="text-gray-400 text-sm mb-1">{title}</h3>
    <p className="text-3xl font-bold mb-1">{value}</p>
    <p className="text-gray-500 text-sm">{subtitle}</p>
  </div>
);

export default Dashboard;
