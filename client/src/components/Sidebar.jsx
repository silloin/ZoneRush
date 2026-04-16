import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map as MapIcon, User as UserIcon, Activity, Flag, Trophy, Users, Award, Home, MessageCircle, X } from 'lucide-react';
import FriendsModal from './Chat/FriendsModal';

const Sidebar = ({ isOpen = true, onClose, isChatActive }) => {
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
      {/* Mobile Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      <div 
        className={`
          w-64 bg-gray-900/90 backdrop-blur-xl border-r border-gray-800/50 h-screen flex-shrink-0 shadow-2xl
          transition-all duration-300 ease-in-out flex flex-col
          
          // Default desktop state (visible, relative)
          md:flex md:relative md:z-auto md:translate-x-0

          // Mobile default state (hidden, fixed)
          fixed inset-y-0 left-0 z-50 transform -translate-x-full

          // Mobile open state
          ${isOpen ? 'translate-x-0' : ''}

          // Override for chat active (hidden on all screens)
          ${isChatActive ? 'hidden' : ''}
        `}
      >
        
        {/* Logo */}
        <div className="p-6 flex-shrink-0 border-b border-gray-800/50 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black gradient-text tracking-tight drop-shadow-lg">
              ZoneRush
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Run The City</p>
          </div>
          {/* Close button - visible only on mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-lg hover:bg-gray-800 transition"
            aria-label="Close sidebar"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 gap-1.5 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 flex flex-col">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                title={item.name}
                onClick={() => {
                  // Auto-close sidebar on mobile when navigating
                  if (onClose && window.innerWidth < 768) {
                    onClose();
                  }
                }}
                className={`
                  flex items-center justify-start 
                  px-4 py-3 rounded-xl transition-all duration-200 whitespace-nowrap
                  group relative
                  ${
                    isActive 
                      ? 'bg-gradient-to-r from-orange-600/20 to-red-600/20 text-orange-400 border-l-2 border-orange-500 shadow-lg shadow-orange-500/10' 
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-white border-l-2 border-transparent hover:border-gray-600'
                  }
                `}
              >
                <Icon className="mr-3 flex-shrink-0 transition-transform group-hover:scale-110" size={18} />
                <span className="font-semibold text-sm">{item.name}</span>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 rounded-xl" />
                )}
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