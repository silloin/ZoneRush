import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock } from 'lucide-react';

const LABELS = { email: 'Email', password: 'Password', submit: 'Login', title: 'Login to RunTerra' };

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { login, user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const { email, password } = formData;

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      console.log('✅ User already logged in, redirecting to dashboard');
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('🔄 Starting login...');
      await login(email, password);
      console.log('✅ Login complete, redirecting to home...');
      
      // Small delay to ensure state updates propagate
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 100);
    } catch (err) {
      console.error('❌ Login error:', err);
      alert(err.response?.data?.msg || 'Login failed');
    }
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-xl">Checking authentication...</div>
      </div>
    );
  }

  // Don't render login form if user is already authenticated
  if (user) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Animated Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 via-red-600/10 to-orange-600/10 blur-3xl animate-pulse" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="bg-gray-800/60 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-gray-700/50">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-block mb-4"
            >
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                <LogIn className="text-white" size={32} />
              </div>
            </motion.div>
            <h2 className="text-4xl font-black gradient-text mb-2">{LABELS.title}</h2>
            <p className="text-gray-400 text-sm">Welcome back, runner!</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-gray-300 mb-2 text-sm font-semibold">
                {LABELS.email}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={onChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900/70 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-gray-300 mb-2 text-sm font-semibold">
                {LABELS.password}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={password}
                  onChange={onChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900/70 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-orange-500/30 hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
              <LogIn size={20} />
              {LABELS.submit}
            </button>
          </form>

          <p className="mt-6 text-gray-400 text-center text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-orange-500 hover:text-red-500 font-semibold transition-colors hover:underline">
              Register
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
