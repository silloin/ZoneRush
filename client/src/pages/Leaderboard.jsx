import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, Medal, Crown } from 'lucide-react';

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const res = await axios.get('/api/users/leaderboard');
        setLeaders(res.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchLeaders();
  }, []);

  if (loading) return <div className="p-8 text-white">Loading leaderboard...</div>;

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center mb-12">
          <Trophy className="text-yellow-500 mr-4" size={48} />
          <h1 className="text-4xl font-extrabold tracking-tight">Global Leaderboard</h1>
        </div>

        <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-700/50 text-gray-400 uppercase text-sm tracking-wider">
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Runner</th>
                <th className="px-6 py-4">Tiles Captured</th>
                <th className="px-6 py-4">Total Distance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {leaders.map((leader, index) => (
                <tr key={leader.id} className="hover:bg-gray-750 transition">
                  <td className="px-6 py-5">
                    {index === 0 && <Crown className="text-yellow-400" />}
                    {index === 1 && <Medal className="text-gray-300" />}
                    {index === 2 && <Medal className="text-orange-400" />}
                    {index > 2 && <span className="font-bold text-gray-500">{index + 1}</span>}
                  </td>
                  <td className="px-6 py-5 font-bold text-lg">{leader.username}</td>
                  <td className="px-6 py-5">
                    <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full font-bold">
                      {leader.totaltiles} Tiles
                    </span>
                  </td>
                  <td className="px-6 py-5 text-gray-400">{Number(leader.totaldistance).toFixed(2)} km</td>
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
