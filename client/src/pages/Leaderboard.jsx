import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Trophy, Medal, Crown } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import UserProfileModal from '../components/Chat/UserProfileModal';

const Leaderboard = () => {
  const { user } = useContext(AuthContext);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const res = await axios.get('/users/leaderboard');
        setLeaders(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        setLeaders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaders();
  }, []);

  const handleUserClick = (leader) => {
    if (leader.id !== user?.id) {
      setSelectedUser({ id: leader.id, username: leader.username });
      setIsProfileModalOpen(true);
    }
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setSelectedUser(null);
  };

  if (loading) return <div className="p-8 text-white">Loading leaderboard...</div>;

  return (
    <div className="p-4 sm:p-8 bg-gray-900 min-h-screen text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-center mb-8 sm:mb-12">
          <Trophy className="text-yellow-500 mr-0 sm:mr-4 mb-2 sm:mb-0" size={36} />
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-center">Global Leaderboard</h1>
        </div>

        <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-full">
              <thead>
                <tr className="bg-gray-700/50 text-gray-400 uppercase text-xs sm:text-sm tracking-wider">
                  <th className="px-3 sm:px-6 py-3 sm:py-4">Rank</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4">Runner</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4">Tiles</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">Distance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {Array.isArray(leaders) && leaders.length > 0 ? (
                  leaders.map((leader, index) => (
                    <tr 
                      key={leader.id || index} 
                      onClick={() => handleUserClick(leader)}
                      className={`hover:bg-gray-700 transition cursor-pointer ${
                        leader.id === user?.id ? 'bg-blue-900/30' : ''
                      }`}
                    >
                      <td className="px-3 sm:px-6 py-3 sm:py-5">
                        {index === 0 && <Crown className="text-yellow-400" size={20} />}
                        {index === 1 && <Medal className="text-gray-300" size={20} />}
                        {index === 2 && <Medal className="text-orange-400" size={20} />}
                        {index > 2 && <span className="font-bold text-gray-500 text-sm sm:text-base">{index + 1}</span>}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm sm:text-lg">{leader.username}</span>
                          {leader.id === user?.id && (
                            <span className="text-xs bg-blue-600 px-2 py-1 rounded">You</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-5">
                        <span className="bg-blue-600/20 text-blue-400 px-2 sm:px-3 py-1 rounded-full font-bold text-xs sm:text-sm">
                          {leader.totalTiles || leader.totaltiles}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-5 text-gray-400 text-xs sm:text-sm hidden sm:table-cell">{Number(leader.totalDistance || leader.totaldistance).toFixed(2)} km</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-3 sm:px-6 py-3 sm:py-5 text-center text-gray-400 text-sm">No leaderboard data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Profile Modal */}
        <UserProfileModal
          userId={selectedUser?.id}
          username={selectedUser?.username}
          isOpen={isProfileModalOpen}
          onClose={closeProfileModal}
        />
      </div>
    </div>
  );
};

export default Leaderboard;
