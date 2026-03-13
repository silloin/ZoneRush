import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Activity, 
  Trophy, 
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Route,
  Trash2,
  Share2
} from 'lucide-react';

import RouteReplay from '../components/RouteReplay/RouteReplay';

const RunHistory = () => {
  const { user } = useContext(AuthContext);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRun, setExpandedRun] = useState(null);
  const [filter, setFilter] = useState('all'); // all, week, month
  const [replayRun, setReplayRun] = useState(null);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/runs', {
        headers: { 'x-auth-token': token }
      });
      setRuns(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch runs:', err);
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteRun = async (runId) => {
    if (!confirm('Are you sure you want to delete this run?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/runs/${runId}`, {
        headers: { 'x-auth-token': token }
      });
      setRuns(runs.filter(run => run.id !== runId));
    } catch (err) {
      console.error('Failed to delete run:', err);
      alert('Failed to delete run');
    }
  };

  const shareRun = async (run) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/social/posts', {
        runId: run.id,
        caption: `Just completed a ${parseFloat(run.distance).toFixed(2)}km run! 🏃‍♂️`
      }, {
        headers: { 'x-auth-token': token }
      });
      alert('Run shared to social feed!');
    } catch (err) {
      console.error('Failed to share run:', err);
      alert('Failed to share run');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Unknown date';
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Unknown date';
    }
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    }
    return `${m}m ${s}s`;
  };

  const getFilteredRuns = () => {
    if (filter === 'all') return runs;
    
    const now = new Date();
    const cutoff = new Date();
    
    if (filter === 'week') {
      cutoff.setDate(now.getDate() - 7);
    } else if (filter === 'month') {
      cutoff.setMonth(now.getMonth() - 1);
    }
    
    return runs.filter(run => new Date(run.created_at || run.id) >= cutoff);
  };

  const filteredRuns = getFilteredRuns();

  // Calculate stats
  const totalDistance = runs.reduce((acc, run) => acc + parseFloat(run.distance || 0), 0);
  const totalDuration = runs.reduce((acc, run) => acc + (run.duration || 0), 0);
  const avgPace = runs.length > 0 
    ? (runs.reduce((acc, run) => acc + parseFloat(run.avgpace || 0), 0) / runs.length).toFixed(2)
    : '0.00';

  if (loading) return (
    <div className="p-8 bg-gray-900 min-h-screen text-white flex items-center justify-center">
      <div className="text-xl">Loading run history...</div>
    </div>
  );

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center">
            <Route className="mr-3 text-blue-500" size={32} /> Run History
          </h1>
          <div className="flex items-center space-x-2 bg-gray-800 p-1 rounded-lg">
            {['all', 'week', 'month'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-md capitalize transition ${
                  filter === f 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'All Time' : f === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center mb-2">
              <Trophy className="text-yellow-500 mr-2" />
              <span className="text-gray-400">Total Runs</span>
            </div>
            <p className="text-3xl font-bold">{runs.length}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center mb-2">
              <MapPin className="text-green-500 mr-2" />
              <span className="text-gray-400">Total Distance</span>
            </div>
            <p className="text-3xl font-bold">{totalDistance.toFixed(2)} km</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center mb-2">
              <Clock className="text-blue-500 mr-2" />
              <span className="text-gray-400">Total Time</span>
            </div>
            <p className="text-3xl font-bold">{Math.floor(totalDuration / 3600)}h {Math.floor((totalDuration % 3600) / 60)}m</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center mb-2">
              <TrendingUp className="text-purple-500 mr-2" />
              <span className="text-gray-400">Avg Pace</span>
            </div>
            <p className="text-3xl font-bold">{avgPace} min/km</p>
          </div>
        </div>

        {/* Runs List */}
        <div className="space-y-4">
          {filteredRuns.length > 0 ? (
            filteredRuns.map((run, index) => (
              <div 
                key={run.id} 
                className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
              >
                {/* Run Header - Always visible */}
                <div 
                  className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-750 transition"
                  onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                >
                  <div className="flex items-center space-x-6">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-xl font-bold">
                      #{runs.length - index}
                    </div>
                    <div>
                      <p className="text-lg font-bold">{formatDate(run.created_at)}</p>
                      <p className="text-gray-400 text-sm">
                        {run.route ? (() => {
                          try {
                            return JSON.parse(run.route).length;
                          } catch {
                            return 0;
                          }
                        })() : 0} GPS points recorded
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-8">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-400">
                        {parseFloat(run.distance || 0).toFixed(2)} km
                      </p>
                      <p className="text-xs text-gray-500">Distance</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">
                        {formatDuration(run.duration)}
                      </p>
                      <p className="text-xs text-gray-500">Duration</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-400">
                        {parseFloat(run.avgpace || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">Pace (min/km)</p>
                    </div>
                    <div className="text-gray-400">
                      {expandedRun === run.id ? <ChevronUp /> : <ChevronDown />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedRun === run.id && (
                  <div className="border-t border-gray-700 p-6 bg-gray-800/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Route Preview */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-400 mb-3 flex items-center">
                          <Route className="mr-2" size={16} /> Route Preview
                        </h4>
                        {run.route ? (
                          <div className="bg-gray-900 p-4 rounded-lg">
                            <p className="text-sm text-gray-400 mb-2">
                              {(() => {
                                try {
                                  return JSON.parse(run.route).length;
                                } catch {
                                  return 0;
                                }
                              })()} waypoints
                            </p>
                            <div className="h-32 bg-gray-800 rounded flex items-center justify-center">
                              <Activity className="text-gray-600" size={48} />
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500">No route data available</p>
                        )}
                      </div>

                      {/* Stats Grid */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-400 mb-3 flex items-center">
                          <Activity className="mr-2" size={16} /> Run Statistics
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-900 p-4 rounded-lg">
                            <p className="text-gray-500 text-xs">Distance</p>
                            <p className="text-xl font-bold">{parseFloat(run.distance || 0).toFixed(2)} km</p>
                          </div>
                          <div className="bg-gray-900 p-4 rounded-lg">
                            <p className="text-gray-500 text-xs">Duration</p>
                            <p className="text-xl font-bold">{formatDuration(run.duration)}</p>
                          </div>
                          <div className="bg-gray-900 p-4 rounded-lg">
                            <p className="text-gray-500 text-xs">Avg Pace</p>
                            <p className="text-xl font-bold">{parseFloat(run.avgpace || 0).toFixed(2)} min/km</p>
                          </div>
                          <div className="bg-gray-900 p-4 rounded-lg">
                            <p className="text-gray-500 text-xs">Est. Calories</p>
                            <p className="text-xl font-bold">~{Math.round(parseFloat(run.distance || 0) * 60)} kcal</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-700">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplayRun(run);
                        }}
                        className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
                      >
                        <Activity className="mr-2" size={16} /> Replay Run
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          shareRun(run);
                        }}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                      >
                        <Share2 className="mr-2" size={16} /> Share to Feed
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRun(run.id);
                        }}
                        className="flex items-center px-4 py-2 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition"
                      >
                        <Trash2 className="mr-2" size={16} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-gray-800 p-12 rounded-lg text-center text-gray-400">
              <Activity className="mx-auto mb-4 text-gray-600" size={48} />
              <p className="text-xl mb-2">No runs found</p>
              <p>Start running to see your history here!</p>
            </div>
          )}
        </div>
      </div>

      {/* Route Replay Modal */}
      {replayRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden relative shadow-2xl">
            <button 
              onClick={() => setReplayRun(null)}
              className="absolute top-4 right-4 z-50 bg-gray-900/80 p-2 rounded-full hover:bg-red-500 transition"
            >
              <Trash2 size={24} />
            </button>
            <div className="flex-1">
              <RouteReplay runId={replayRun.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RunHistory;
