import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

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
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-xl shadow-2xl w-96 border border-red-500/20">
        <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-clip-text text-transparent text-center">{LABELS.title}</h2>
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-300 mb-2">{LABELS.email}</label>
            <input
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={onChange}
              className="w-full p-3 rounded-lg bg-gray-700/50 text-white border border-gray-600 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-300 mb-2">{LABELS.password}</label>
            <input
              id="password"
              type="password"
              name="password"
              value={password}
              onChange={onChange}
              className="w-full p-3 rounded-lg bg-gray-700/50 text-white border border-gray-600 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition"
              required
            />
          </div>
          <button className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white p-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition transform hover:scale-105">
            {LABELS.submit}
          </button>
        </form>
        <p className="mt-6 text-gray-400 text-center">
          Don't have an account? <Link to="/register" className="text-orange-500 hover:text-red-500 font-semibold transition">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
