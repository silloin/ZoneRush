import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Achievements = ({ userId }) => {
  const [achievements, setAchievements] = useState([]);
  const [progress, setProgress] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unlocked, locked
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
  }, [userId]);

  const fetchAchievements = async () => {
    try {
      const [progressRes, unlockedRes] = await Promise.all([
        axios.get(`/achievements/user/${userId}/progress`),
        axios.get(`/achievements/user/${userId}`)
      ]);

      // Deduplicate progress by achievement id and name
      const deduplicatedProgress = [];
      const seenIds = new Set();
      
      for (const item of progressRes.data) {
        // Use id as primary key, fallback to name if id is missing
        const uniqueKey = item.id || item.name;
        if (!seenIds.has(uniqueKey)) {
          seenIds.add(uniqueKey);
          deduplicatedProgress.push(item);
        }
      }
      
      console.log(`Achievements API returned ${progressRes.data.length} items, deduplicated to ${deduplicatedProgress.length}`);
      
      // Limit to 8 achievements for better performance
      const limitedProgress = deduplicatedProgress.slice(0, 8);
      
      setProgress(limitedProgress);
      setAchievements(unlockedRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      setLoading(false);
    }
  };


  const getBadgeColor = (tier) => {
    switch (tier) {
      case 'bronze': return 'from-amber-700 to-amber-900';
      case 'silver': return 'from-gray-400 to-gray-600';
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'platinum': return 'from-cyan-400 to-blue-600';
      default: return 'from-gray-600 to-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'distance': return '📏';
      case 'tiles': return '🗺️';
      case 'streak': return '🔥';
      case 'speed': return '⚡';
      case 'milestone': return '🏆';
      default: return '🎯';
    }
  };

  const filteredProgress = progress.filter(achievement => {
    if (filter === 'unlocked') return achievement.isUnlocked;
    if (filter === 'locked') return !achievement.isUnlocked;
    return true;
  });

  // Deduplicate filtered progress before rendering
  const dedicatedSeenNames = new Set();
  const finalDeduplicatedProgress = [];
  for (const achievement of filteredProgress) {
    const uniqueKey = achievement.id || achievement.name;
    if (!dedicatedSeenNames.has(uniqueKey)) {
      dedicatedSeenNames.add(uniqueKey);
      finalDeduplicatedProgress.push(achievement);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🏆 Achievements</h1>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-6">
            <p className="text-sm opacity-80 mb-2">Total Unlocked</p>
            <p className="text-4xl font-bold">{achievements.length}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-6">
            <p className="text-sm opacity-80 mb-2">Total Available</p>
            <p className="text-4xl font-bold">{progress.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-6">
            <p className="text-sm opacity-80 mb-2">Completion</p>
            <p className="text-4xl font-bold">
              {progress.length > 0 ? Math.round((achievements.length / progress.length) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              filter === 'all' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            All ({progress.length})
          </button>
          <button
            onClick={() => setFilter('unlocked')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              filter === 'unlocked' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Unlocked ({achievements.length})
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              filter === 'locked' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Locked ({progress.length - achievements.length})
          </button>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {finalDeduplicatedProgress.map((achievement, index) => (
            <AchievementCard
              key={`achievement-${achievement.id || achievement.name || index}`}
              achievement={achievement}
              getBadgeColor={getBadgeColor}
              getCategoryIcon={getCategoryIcon}
            />
          ))}

        </div>
      </div>
    </div>
  );
};

const AchievementCard = ({ achievement, getBadgeColor, getCategoryIcon }) => {
  const isUnlocked = achievement.isUnlocked;
  
  return (
    <div
      className={`rounded-lg p-6 transition-all duration-300 ${
        isUnlocked
          ? `bg-gradient-to-br ${getBadgeColor(achievement.badge_tier)} shadow-lg hover:scale-105`
          : 'bg-gray-800 opacity-60 hover:opacity-80'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-4xl">{achievement.icon || getCategoryIcon(achievement.category)}</div>
        {isUnlocked && (
          <div className="bg-green-500 rounded-full p-1">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      <h3 className="text-xl font-bold mb-2">{achievement.name}</h3>
      <p className="text-sm opacity-80 mb-4">{achievement.description}</p>

      {!isUnlocked && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span>{achievement.percentage}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${achievement.percentage}%` }}
            />
          </div>
          <p className="text-xs opacity-60 mt-1">
            {achievement.currentValue} / {achievement.requirement_value}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="bg-black bg-opacity-30 px-3 py-1 rounded-full">
          {achievement.badge_tier}
        </span>
        <span className="text-yellow-400 font-semibold">+{achievement.xp_reward} XP</span>
      </div>
    </div>
  );
};

export default Achievements;
