import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map as MapIcon, User as UserIcon, Activity, Flag, Trophy, Users, Award, Home, MessageCircle } from 'lucide-react';
import FriendsModal from './Chat/FriendsModal';

const Sidebar = () => {
  const location = useLocation();
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);

  const menuItems = [
    { name: 'Home', icon: Home, path: '/' },
    { name: 'Live Map', icon: MapIcon, path: '/map' },
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Run History', icon: Activity, path: '/runs' },
    { name: 'Leaderboard', icon: Trophy, path: '/leaderboard' },
    { name: 'Social Feed', icon: Users, path: '/social' },
    { name: 'Chat', icon: MessageCircle, path: '/chat' },
    { name: 'Achievements', icon: Award, path: '/achievements' },
    { name: 'Training Plans', icon: Activity, path: '/training' },
    { name: 'Events', icon: Flag, path: '/events' },
    { name: 'Profile', icon: UserIcon, path: '/profile' },
  ];

  return (
    <>
      <div className="w-full md:w-64 bg-gray-900 md:h-screen border-b md:border-b-0 md:border-r border-gray-800 flex md:flex-col p-2 md:p-4">
        <div className="mb-2 md:mb-8 flex-shrink-0">
          <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-clip-text text-transparent tracking-wider">RunTerra</h1>
        </div>

      <nav className="flex md:flex-col flex-1 md:max-h-[calc(100vh-200px)] overflow-y-auto md:space-y-2 space-x-1 md:space-x-0 justify-around md:justify-start scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              title={item.name}
              className={`flex flex-col md:flex-row items-center justify-center md:justify-start p-2 md:p-3 rounded-lg transition flex-1 md:flex-none ${
                isActive 
                  ? 'bg-gradient-to-r from-red-600/30 to-orange-600/30 text-orange-500 border-l-2 border-orange-500' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white hover:border-l-2 hover:border-gray-600'
              }`}
            >
              <Icon className="md:mr-3" size={18} />
              <span className="hidden md:inline font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>

    {/* Friends Modal */}
    <FriendsModal 
      isOpen={isFriendsModalOpen} 
      onClose={() => setIsFriendsModalOpen(false)} 
    />
  </>
  );
};

export default Sidebar;
