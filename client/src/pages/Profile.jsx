import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { User, MapPin, Award, Shield, Zap, Target } from 'lucide-react';

const Profile = () => {
  const { user } = useContext(AuthContext);

  const badges = [
    { name: 'Pioneer', icon: Zap, description: 'First 50 tiles captured', achieved: (user?.totalTiles || 0) >= 50 },
    { name: 'City King', icon: Shield, description: 'Become a King of a zone', achieved: false },
    { name: 'Marathoner', icon: Target, description: 'Total distance > 42.2km', achieved: (user?.totalDistance || 0) >= 42.2 },
    { name: 'Explorer', icon: Award, description: 'Capture tiles in 3 different cities', achieved: false },
  ];

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white text-center">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-2xl p-8 mb-8 flex flex-col md:flex-row items-center shadow-2xl border border-gray-700">
          <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center text-5xl font-bold mb-6 md:mb-0 md:mr-8 border-4 border-gray-700">
            {user?.username?.[0].toUpperCase()}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-bold mb-2">{user?.username}</h1>
            <div className="flex items-center justify-center md:justify-start text-gray-400 mb-4">
              <MapPin size={18} className="mr-2 text-red-500" />
              <span>{user?.city || 'Unknown City'}</span>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="bg-gray-700/50 px-4 py-2 rounded-lg">
                <p className="text-xs text-gray-400 uppercase">Rank</p>
                <p className="text-xl font-bold text-blue-400">{user?.role === 'admin' ? 'Elite Commander' : 'Scout'}</p>
              </div>
              <div className="bg-gray-700/50 px-4 py-2 rounded-lg">
                <p className="text-xs text-gray-400 uppercase">Joined</p>
                <p className="text-xl font-bold text-white">2026</p>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6 flex items-center justify-center md:justify-start">
          <Award className="mr-3 text-yellow-500" /> Achievement Badges
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div key={badge.name} className={`p-6 rounded-xl border transition flex items-center ${
                badge.achieved ? 'bg-blue-600/10 border-blue-500' : 'bg-gray-800/50 border-gray-700 grayscale opacity-50'
              }`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mr-6 ${
                  badge.achieved ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}>
                  <Icon size={32} />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold">{badge.name}</h3>
                  <p className="text-gray-400 text-sm">{badge.description}</p>
                  {badge.achieved && (
                    <span className="text-xs font-bold text-blue-400 uppercase mt-2 block">Unlocked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Profile;
