import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Achievements = () => {
  const { user } = useContext(AuthContext);
  const [achievements, setAchievements] = useState([]);
  const [profile, setProfile] = useState(null);
  
  // Daily status state
  const [dailyStatus, setDailyStatus] = useState(null);
  const [claimingMsg, setClaimingMsg] = useState("");

  useEffect(() => {
    fetchAchievements();
    if (user?.id) {
      fetchProfile();
      fetchDailyStatus();
    }
  }, [user]);

  const fetchAchievements = async () => {
    try {
      const res = await axios.get('/achievements');
      setAchievements(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProfile = async () => {
    try {
      if (!user?.id) return;
      const res = await axios.get(`/achievements/profile/${user.id}`);
      setProfile(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDailyStatus = async () => {
    try {
      if (!user?.id) return;
      const res = await axios.get(`/achievements/daily-status/${user.id}`);
      setDailyStatus(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const claimDaily = async () => {
    try {
      if (!user?.id) return;
      setClaimingMsg("Claiming...");
      const res = await axios.post(`/achievements/claim-daily/${user.id}`);
      setClaimingMsg(`+${dailyStatus?.activeTask?.xp || 100} XP Earned!`);
      setDailyStatus(prev => ({ ...prev, hasClaimedToday: true }));
      // Optionally refresh profile to update the top XP badge
      fetchProfile();
    } catch (err) {
      console.error(err);
      setClaimingMsg("Failed to claim.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-gray-900 min-h-screen text-white">
      {profile && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl border border-gray-700 rounded-2xl p-6 sm:p-8 mb-8">
          <h2 className="text-2xl sm:text-3xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{profile.username}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Level</p>
              <p className="text-2xl sm:text-3xl font-black text-white">{profile.level}</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">XP</p>
              <p className="text-2xl sm:text-3xl font-black text-blue-400">{profile.xp}</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Distance</p>
              <p className="text-2xl sm:text-3xl font-black text-green-400">{Number(profile.totaldistance || 0).toFixed(1)}<span className="text-sm text-green-500/50 ml-1">km</span></p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Tiles</p>
              <p className="text-2xl sm:text-3xl font-black text-purple-400">{profile.totaltiles}</p>
            </div>
          </div>
        </div>
      )}

      {dailyStatus && (
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <span className="text-8xl">🏃</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black mb-2 flex items-center gap-2">
            <span className="text-yellow-400">⚡</span> Daily Task: {dailyStatus.activeTask.title}
          </h3>
          <p className="text-gray-300 mb-4 sm:text-lg">{dailyStatus.activeTask.desc} to earn <span className="font-bold text-blue-400">+{dailyStatus.activeTask.xp} XP</span>!</p>
          
          <div className="mb-4">
            <div className="flex justify-between text-xs sm:text-sm font-bold text-gray-400 mb-1">
              <span>Progress</span>
              <span>{Math.min(dailyStatus.metricValue, dailyStatus.activeTask.target).toFixed(2)} / {dailyStatus.activeTask.target.toFixed(2)} {dailyStatus.activeTask.unit}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden border border-gray-700">
              <div 
                className={`h-4 transition-all duration-1000 ${dailyStatus.isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min((dailyStatus.metricValue / dailyStatus.activeTask.target) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          {dailyStatus.isCompleted ? (
            dailyStatus.hasClaimedToday ? (
              <button disabled className="w-full sm:w-auto bg-gray-700 text-gray-400 px-6 py-3 rounded-xl font-bold cursor-not-allowed">
                ✅ Reward Claimed
              </button>
            ) : (
              <button 
                onClick={claimDaily}
                className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-[0_0_15px_rgba(16,185,129,0.5)] transform hover:scale-105 transition-all"
              >
                {claimingMsg || `🎉 Claim ${dailyStatus.activeTask.xp} XP`}
              </button>
            )
          ) : (
            <button disabled className="w-full sm:w-auto bg-gray-800 text-gray-500 border border-gray-700 px-6 py-3 rounded-xl font-bold cursor-not-allowed">
              Keep Running to Unlock
            </button>
          )}
        </div>
      )}

      <h3 className="text-2xl sm:text-3xl font-black mb-6 flex items-center gap-3">
        🏆 Achievement Badges
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`rounded-2xl p-6 transition-all duration-300 relative overflow-hidden backdrop-blur-sm ${
              achievement.unlockedat 
                ? 'bg-gray-800 border-2 border-yellow-500/80 shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] transform hover:-translate-y-1' 
                : 'bg-gray-800/40 border border-gray-700 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500'
            }`}
          >
            {achievement.unlockedat && (
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/10 blur-2xl rounded-full pointer-events-none" />
            )}
            <div className="text-5xl sm:text-6xl mb-4 text-center transform group-hover:scale-110 transition-transform">{achievement.icon || '🏅'}</div>
            
            <div className="text-center relative z-10">
              <h4 className="font-black text-white text-lg sm:text-xl mb-2">{achievement.name}</h4>
              <p className="text-sm text-gray-400 mb-4 h-10">{achievement.description}</p>
              
              <div className="inline-block bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                +{achievement.xpreward} XP
              </div>
              
              {achievement.unlockedat && (
                <p className="text-xs font-bold text-yellow-500 mt-2 bg-yellow-500/10 py-1 rounded-lg">
                  Unlocked: {new Date(achievement.unlockedat).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Achievements;
