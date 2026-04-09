import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Map as MapIcon, LogOut, User as UserIcon, Activity, Flag, Trophy, Users, Award, Home, MessageCircle, UserPlus } from 'lucide-react';
import NotificationBell from './Notifications/NotificationBell';
import FriendsModal from './Chat/FriendsModal';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
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
        <div className="mb-2 md:mb-8 flex-shrink-0 flex items-center justify-between">
          <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-clip-text text-transparent tracking-wider">RunTerra</h1>
          {/* Notification & Friends Buttons - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setIsFriendsModalOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition"
              title="Friends"
            >
              <UserPlus size={20} />
            </button>
            <NotificationBell onOpenFriends={() => setIsFriendsModalOpen(true)} />
          </div>
        </div>

        {/* Mobile Header Actions */}
        <div className="flex md:hidden items-center gap-2 ml-auto mr-2">
          <button
            onClick={() => setIsFriendsModalOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition"
            title="Friends"
          >
            <UserPlus size={20} />
          </button>
          <NotificationBell onOpenFriends={() => setIsFriendsModalOpen(true)} />
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

      <div className="hidden md:block mt-4 sticky bottom-0 pt-6 pb-4 border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm z-10">
        <div className="flex items-center p-3 mb-4 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-lg border border-orange-500/30">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mr-3 text-white font-bold shadow-lg">
            {user?.username?.[0].toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white truncate">{user?.username}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center p-3 text-red-500 hover:bg-red-500/10 rounded-lg transition"
        >
          <LogOut className="mr-3" size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>

      <div className="md:hidden flex items-center ml-2">
        <button
          onClick={logout}
          className="flex items-center p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"
        >
          <LogOut size={16} />
        </button>
      </div>
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
