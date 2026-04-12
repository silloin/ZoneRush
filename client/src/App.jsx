import React, { useContext, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Map from './components/Map/Map';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import TrainingPlans from './pages/TrainingPlans';
import Events from './pages/Events';
import Profile from './pages/Profile';
import RunHistory from './pages/RunHistory';
import Sidebar from './components/Sidebar';
import SocialFeed from './components/SocialFeed';
import Achievements from './components/Achievements/Achievements';
import ChatLayout from './components/Chat/ChatLayout';
import './App.css';

// Optimized ProtectedRoute with React.memo to prevent unnecessary re-renders
const ProtectedRoute = React.memo(({ children }) => {
  const { user, loading } = useContext(AuthContext);

  // Memoize the result to prevent re-renders
  const result = useMemo(() => {
    if (loading) {
      return (
        <div className="h-screen w-screen bg-gray-900 flex items-center justify-center text-white text-2xl font-bold">
          🏃 Loading...
        </div>
      );
    }

    if (!user) {
      console.warn('❌ No user found, redirecting to login');
      return <Navigate to="/login" replace />;
    }

    return children;
  }, [user, loading, children]);

  return result;
});

ProtectedRoute.displayName = 'ProtectedRoute';

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col md:flex-row w-full h-screen overflow-hidden bg-gray-900">
      <Sidebar />
      <div className="flex-1 relative overflow-auto">
        {children}
      </div>
    </div>
  );
};

// Wrapper component to pass userId to Achievements
const AchievementsWrapper = () => {
  const { user } = useContext(AuthContext);
  return <Achievements userId={user?.id} />;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="App w-full h-screen">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Home />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/map"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Map />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Leaderboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/training"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TrainingPlans />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Events />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/social"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SocialFeed />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/achievements"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AchievementsWrapper />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/runs"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RunHistory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <div className="h-screen w-full">
                    <ChatLayout />
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
