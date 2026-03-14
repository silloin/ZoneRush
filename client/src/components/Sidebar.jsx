import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Map as MapIcon, LogOut, User as UserIcon, Activity, Flag, Trophy, Users, Award } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const menuItems = [
    { name: 'Live Map', icon: MapIcon, path: '/' },
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Run History', icon: Activity, path: '/runs' },
    { name: 'Leaderboard', icon: Trophy, path: '/leaderboard' },
    { name: 'Social Feed', icon: Users, path: '/social' },
    { name: 'Achievements', icon: Award, path: '/achievements' },
    { name: 'Training Plans', icon: Activity, path: '/training' },
    { name: 'Events', icon: Flag, path: '/events' },
    { name: 'Profile', icon: UserIcon, path: '/profile' },
  ];

  return (
    <div className="w-full md:w-64 bg-gray-900 md:h-screen border-b md:border-b-0 md:border-r border-gray-800 flex md:flex-col p-2 md:p-4">
      <div className="mb-2 md:mb-8 flex-shrink-0">
        <h1 className="text-lg md:text-2xl font-bold text-blue-500 tracking-wider">RunTerra</h1>
      </div>

      <nav className="flex md:flex-col flex-1 md:space-y-2 space-x-1 md:space-x-0 overflow-x-auto md:overflow-x-visible">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center p-2 md:p-3 rounded-lg transition whitespace-nowrap flex-shrink-0 ${
                isActive ? 'bg-blue-600/20 text-blue-500' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="mr-1 md:mr-3" size={16} />
              <span className="font-medium text-xs md:text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden md:block mt-auto pt-6 border-t border-gray-800">
        <div className="flex items-center p-3 mb-4 bg-gray-800/50 rounded-lg">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3 text-white font-bold">
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
  );
};

export default Sidebar;
