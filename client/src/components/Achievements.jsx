import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Achievements = () => {
  const { user } = useContext(AuthContext);
  const [achievements, setAchievements] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchAchievements();
    if (user?.id) {
      fetchProfile();
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

  return (
    <div className="max-w-4xl mx-auto p-2 sm:p-4">
      {profile && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">{profile.username}</h2>
          <div className="grid grid-cols-2 sm:flex sm:space-x-6 gap-4 sm:gap-0 text-sm sm:text-lg">
            <div>
              <p className="text-blue-200">Level</p>
              <p className="text-xl sm:text-2xl font-bold">{profile.level}</p>
            </div>
            <div>
              <p className="text-blue-200">XP</p>
              <p className="text-xl sm:text-2xl font-bold">{profile.xp}</p>
            </div>
            <div>
              <p className="text-blue-200">Distance</p>
              <p className="text-xl sm:text-2xl font-bold">{Number(profile.totaldistance || 0).toFixed(1)}km</p>
            </div>
            <div>
              <p className="text-blue-200">Tiles</p>
              <p className="text-xl sm:text-2xl font-bold">{profile.totaltiles}</p>
            </div>
          </div>
        </div>
      )}

      <h3 className="text-xl sm:text-2xl font-bold mb-4">Achievements</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`rounded-lg p-3 sm:p-4 ${
              achievement.unlockedat ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100 opacity-50'
            }`}
          >
            <div className="text-3xl sm:text-4xl mb-2">{achievement.icon}</div>
            <h4 className="font-bold text-black text-base sm:text-lg">{achievement.name}</h4>
            <p className="text-xs sm:text-sm text-gray-600">{achievement.description}</p>
            <p className="text-xs text-blue-600 mt-2">+{achievement.xpreward} XP</p>
            {achievement.unlockedat && (
              <p className="text-xs text-green-600 mt-1">
                Unlocked: {new Date(achievement.unlockedat).toLocaleDateString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Achievements;
