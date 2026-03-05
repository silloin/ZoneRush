import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { Trophy, Map as MapIcon, Activity, TrendingUp, Calendar, Upload } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      const res = await axios.get('/api/runs');
      setRuns(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('gpx', file);

    setUploading(true);
    try {
      await axios.post('/api/gpx/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('GPX file uploaded and processed!');
      fetchRuns();
    } catch (err) {
      alert('Failed to upload GPX file');
    }
    setUploading(false);
  };

  if (loading) return <div className="p-8 text-white">Loading stats...</div>;

  const chartData = runs.slice(0, 7).reverse().map((run) => ({
    date: new Date(run.createdat).toLocaleDateString(),
    distance: run.distance,
    pace: parseFloat(run.avgpace),
  }));

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Runner Dashboard</h1>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 p-2 px-4 rounded cursor-pointer transition">
            <Upload size={20} />
            <span>{uploading ? 'Processing...' : 'Upload GPX'}</span>
            <input type="file" className="hidden" accept=".gpx" onChange={handleFileUpload} disabled={uploading} />
          </label>
          <div className="flex items-center space-x-2 bg-gray-800 p-2 rounded">
            <Calendar className="text-blue-400" size={20} />
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center mb-2">
            <Trophy className="text-yellow-500 mr-2" />
            <span className="text-gray-400">Total Distance</span>
          </div>
          <p className="text-3xl font-bold">{user.totalDistance.toFixed(2)} km</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center mb-2">
            <MapIcon className="text-green-500 mr-2" />
            <span className="text-gray-400">Tiles Owned</span>
          </div>
          <p className="text-3xl font-bold">{user.totalTiles}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center mb-2">
            <Activity className="text-blue-500 mr-2" />
            <span className="text-gray-400">Weekly Mileage</span>
          </div>
          <p className="text-3xl font-bold">{user.weeklyMileage.toFixed(2)} km</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center mb-2">
            <TrendingUp className="text-purple-500 mr-2" />
            <span className="text-gray-400">Average Pace</span>
          </div>
          <p className="text-3xl font-bold">
            {(runs.reduce((acc, run) => acc + parseFloat(run.avgpace || 0), 0) / (runs.length || 1)).toFixed(2)} min/km
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Distance (Last 7 Runs)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
                <Bar dataKey="distance" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Pace Trend (Last 7 Runs)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
                <Line type="monotone" dataKey="pace" stroke="#F59E0B" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="py-2">Date</th>
                <th className="py-2">Distance (km)</th>
                <th className="py-2">Duration</th>
                <th className="py-2">Avg Pace (min/km)</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 5).map((run) => (
                <tr key={run.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="py-3">{new Date(run.createdat).toLocaleDateString()}</td>
                  <td className="py-3 font-medium">{run.distance}</td>
                  <td className="py-3">{Math.floor(run.duration / 60)}m {run.duration % 60}s</td>
                  <td className="py-3">{run.avgpace}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
