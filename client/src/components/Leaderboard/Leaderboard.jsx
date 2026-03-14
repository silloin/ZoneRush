import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Leaderboard = ({ currentUserId }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [category, setCategory] = useState('distance');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [category]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const [leaderboardRes, rankRes] = await Promise.all([
        axios.get(`/api/leaderboard?type=${category}&limit=50`),
        axios.get(`/api/leaderboard/user/${currentUserId}/rank?type=${category}`)
      ]);

      setLeaderboard(leaderboardRes.data);
      setUserRank(rankRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLoading(false);
    }
  };

  const categories = [
    { id: 'distance', name: 'Distance', icon: '📏', unit: 'km' },
    { id: 'runs', name: 'Total Runs', icon: '🏃', unit: 'runs' },
    { id: 'tiles', name: 'Tiles Captured', icon: '🗺️', unit: 'tiles' },
    { id: 'xp', name: 'Experience', icon: '⭐', unit: 'XP' },
    { id: 'streak', name: 'Streak', icon: '🔥', unit: 'days' }
  ];

  const formatValue = (value, type) => {
    switch (type) {
      case 'distance':
        return `${(value / 1000).toFixed(2)} km`;
      case 'runs':
        return `${value} runs`;
      case 'tiles':
        return `${value} tiles`;
      case 'xp':
        return `${value} XP`;
      case 'streak':
        return `${value} days`;
      default:
        return value;
    }
  };

  const getValue = (entry, type) => {
    switch (type) {
      case 'distance':
        return entry.total_distance;
      case 'runs':
        return entry.total_runs;
      case 'tiles':
        return entry.total_tiles;
      case 'xp':
        return entry.xp;
      case 'streak':
        return entry.streak;
      default:
        return 0;
    }
  };

  const getMedalColor = (rank) => {
    switch (rank) {
      case 1: return 'from-yellow-400 to-yellow-600';
      case 2: return 'from-gray-300 to-gray-500';
      case 3: return 'from-amber-600 to-amber-800';
      default: return 'from-gray-700 to-gray-900';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🏆 Leaderboard</h1>

        {/* Category Selector */}
        <div className="flex flex-wrap gap-4 mb-8">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                category === cat.id
                  ? 'bg-blue-600 shadow-lg scale-105'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* User's Rank Card */}
        {userRank && userRank.rank && (
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80 mb-1">Your Rank</p>
                <p className="text-4xl font-bold">#{userRank.rank}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80 mb-1">Your Score</p>
                <p className="text-2xl font-bold">
                  {formatValue(getValue(userRank, category), category)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* 2nd Place */}
            <div className="flex flex-col items-center pt-8">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getMedalColor(2)} flex items-center justify-center text-3xl font-bold mb-2`}>
                2
              </div>
              <p className="font-bold text-lg">{leaderboard[1].username}</p>
              <p className="text-sm text-gray-400">
                {formatValue(getValue(leaderboard[1], category), category)}
              </p>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center">
              <div className="text-4xl mb-2">👑</div>
              <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${getMedalColor(1)} flex items-center justify-center text-4xl font-bold mb-2 shadow-2xl`}>
                1
              </div>
              <p className="font-bold text-xl">{leaderboard[0].username}</p>
              <p className="text-sm text-gray-400">
                {formatValue(getValue(leaderboard[0], category), category)}
              </p>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center pt-12">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getMedalColor(3)} flex items-center justify-center text-3xl font-bold mb-2`}>
                3
              </div>
              <p className="font-bold text-lg">{leaderboard[2].username}</p>
              <p className="text-sm text-gray-400">
                {formatValue(getValue(leaderboard[2], category), category)}
              </p>
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left">Rank</th>
                <th className="px-6 py-4 text-left">Runner</th>
                <th className="px-6 py-4 text-left">Level</th>
                <th className="px-6 py-4 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr
                  key={entry.id}
                  className={`border-t border-gray-700 hover:bg-gray-750 transition ${
                    entry.id === currentUserId ? 'bg-blue-900 bg-opacity-30' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {index < 3 ? (
                        <span className="text-2xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-bold">#{entry.rank}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">
                        {entry.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold">{entry.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-purple-600 px-3 py-1 rounded-full text-sm font-semibold">
                      Lv. {entry.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-lg">
                    {formatValue(getValue(entry, category), category)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
