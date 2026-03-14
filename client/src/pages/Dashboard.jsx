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
import { Trophy, Map as MapIcon, Activity, TrendingUp, Calendar, Upload, MessageSquare, Lightbulb } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    fetchRuns();
    if (user?.id) {
      fetchRecommendations();
    }
  }, [user]);

  const fetchRecommendations = async () => {
    try {
      if (!user?.id) return;
      const res = await axios.get(`/ai-coach/recommendations/${user.id}`);
      if (Array.isArray(res.data)) {
        setRecommendations(res.data);
      } else {
        console.error('Recommendations API response is not an array:', res.data);
        setRecommendations([]);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      setRecommendations([]);
    }
  };

  const fetchRuns = async () => {
    try {
      const res = await axios.get('/runs');
      if (Array.isArray(res.data)) {
        setRuns(res.data);
      } else {
        console.error('API response is not an array:', res.data);
        setRuns([]);
      }
    } catch (err) {
      console.error('Failed to fetch runs:', err.response?.status, err.response?.data || err.message);
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('gpxFile', file);

    setUploading(true);
    try {
      await axios.post('/gpx/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('GPX file uploaded and processed!');
      fetchRuns();
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload GPX file');
    }
    setUploading(false);
  };

  if (loading) return <div className="p-8 text-white">Loading stats...</div>;

  const chartData = runs.slice(0, 7).reverse().map((run, idx) => ({
    date: `Run ${idx + 1}`,
    distance: parseFloat(run.distance || 0),
    pace: parseFloat(run.avgpace || 0),
  }));

  const avgPace = runs.length > 0 
    ? (runs.reduce((acc, run) => acc + parseFloat(run.avgpace || 0), 0) / runs.length).toFixed(2)
    : '0.00';

  const totalDistance = runs.length > 0
    ? runs.reduce((acc, run) => acc + parseFloat(run.distance || 0), 0).toFixed(2)
    : '0.00';

  return (
    <div className="p-4 sm:p-8 bg-gray-900 min-h-screen text-white">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Runner Dashboard</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <label className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 p-2 px-4 rounded cursor-pointer transition w-full sm:w-auto justify-center">
            <Upload size={20} />
            <span className="text-sm sm:text-base">{uploading ? 'Processing...' : 'Upload GPX'}</span>
            <input type="file" className="hidden" accept=".gpx" onChange={handleFileUpload} disabled={uploading} />
          </label>
          <div className="flex items-center space-x-2 bg-gray-800 p-2 rounded w-full sm:w-auto justify-center">
            <Calendar className="text-blue-400" size={20} />
            <span className="text-sm sm:text-base">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-gray-800 p-3 sm:p-6 rounded-lg border border-gray-700">
          <div className="flex items-center mb-2">
            <Trophy className="text-yellow-500 mr-1 sm:mr-2" size={16} />
            <span className="text-gray-400 text-xs sm:text-sm">Total Distance</span>
          </div>
          <p className="text-lg sm:text-3xl font-bold">{totalDistance} km</p>
        </div>
        <div className="bg-gray-800 p-3 sm:p-6 rounded-lg border border-gray-700">
          <div className="flex items-center mb-2">
            <MapIcon className="text-green-500 mr-1 sm:mr-2" size={16} />
            <span className="text-gray-400 text-xs sm:text-sm">Tiles Owned</span>
          </div>
          <p className="text-lg sm:text-3xl font-bold">{user?.totalTiles || 0}</p>
        </div>
        <div className="bg-gray-800 p-3 sm:p-6 rounded-lg border border-gray-700">
          <div className="flex items-center mb-2">
            <Activity className="text-blue-500 mr-1 sm:mr-2" size={16} />
            <span className="text-gray-400 text-xs sm:text-sm">Total Runs</span>
          </div>
          <p className="text-lg sm:text-3xl font-bold">{runs.length}</p>
        </div>
        <div className="bg-gray-800 p-3 sm:p-6 rounded-lg border border-gray-700">
          <div className="flex items-center mb-2">
            <TrendingUp className="text-purple-500 mr-1 sm:mr-2" size={16} />
            <span className="text-gray-400 text-xs sm:text-sm">Average Pace</span>
          </div>
          <p className="text-lg sm:text-3xl font-bold">{avgPace} min/km</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
        {/* AI Coach Card */}
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg border border-blue-500/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center">
              <Lightbulb className="text-yellow-400 mr-2" /> AI Running Coach
            </h2>
            <span className="text-xs bg-blue-600 px-2 py-1 rounded">BETA</span>
          </div>
          <div className="space-y-4">
            {Array.isArray(recommendations) && recommendations.length > 0 ? (
              recommendations.map((rec, idx) => (
                <div key={idx} className="bg-gray-900/50 p-4 rounded-lg border-l-4 border-blue-500">
                  <h3 className="font-bold text-blue-400 mb-1">{rec.title}</h3>
                  <p className="text-sm sm:text-base text-gray-300">{rec.description}</p>
                  {rec.recommendation_type && (
                    <span className="text-[10px] uppercase tracking-wider text-blue-500/70 mt-2 block">
                      {rec.recommendation_type.replace('_', ' ')}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-gray-900/50 p-4 rounded-lg italic text-gray-400 text-sm">
                Analyze your runs to get personalized coaching advice.
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Distance (Last 7 Runs)</h2>
          <div className="h-48 sm:h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', fontSize: '12px' }} />
                  <Bar dataKey="distance" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">No runs yet</div>
            )}
          </div>
        </div>
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Pace Trend (Last 7 Runs)</h2>
          <div className="h-48 sm:h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="pace" stroke="#F59E0B" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">No runs yet</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="py-2 text-xs sm:text-sm">Run #</th>
                <th className="py-2 text-xs sm:text-sm">Distance (km)</th>
                <th className="py-2 text-xs sm:text-sm hidden sm:table-cell">Duration</th>
                <th className="py-2 text-xs sm:text-sm">Avg Pace</th>
              </tr>
            </thead>
            <tbody>
              {runs.length > 0 ? (
                runs.slice(0, 5).map((run, idx) => (
                  <tr key={run.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="py-3 text-xs sm:text-sm">#{idx + 1}</td>
                    <td className="py-3 font-medium text-xs sm:text-sm">{parseFloat(run.distance || 0).toFixed(2)}</td>
                    <td className="py-3 text-xs sm:text-sm hidden sm:table-cell">{Math.floor(run.duration / 60)}m {run.duration % 60}s</td>
                    <td className="py-3 text-xs sm:text-sm">{parseFloat(run.avgpace || 0).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-3 text-center text-gray-400 text-xs sm:text-sm">No runs yet. Start running to see your stats!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
