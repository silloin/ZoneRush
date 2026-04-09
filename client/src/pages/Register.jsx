import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const LABELS = { title: 'Register for RunTerra', username: 'Username', email: 'Email', password: 'Password', confirmPassword: 'Confirm Password', submit: 'Register' };

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const { register, user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const { username, email, password, confirmPassword } = formData;

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      console.log('✅ User already logged in, redirecting to dashboard');
      navigate('/');
    }
  }, [user, loading, navigate]);

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    try {
      await register(username, email, password);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.msg || 'Registration failed');
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

  // Don't render register form if user is already authenticated
  if (user) {
    return null;
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-xl shadow-2xl w-96 border border-orange-500/20">
        <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 bg-clip-text text-transparent text-center">{LABELS.title}</h2>
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-300 mb-2">{LABELS.username}</label>
            <input
              id="username"
              type="text"
              name="username"
              value={username}
              onChange={onChange}
              className="w-full p-3 rounded-lg bg-gray-700/50 text-white border border-gray-600 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-300 mb-2">{LABELS.email}</label>
            <input
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={onChange}
              className="w-full p-3 rounded-lg bg-gray-700/50 text-white border border-gray-600 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-300 mb-2">{LABELS.password}</label>
            <input
              id="password"
              type="password"
              name="password"
              value={password}
              onChange={onChange}
              className="w-full p-3 rounded-lg bg-gray-700/50 text-white border border-gray-600 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-gray-300 mb-2">{LABELS.confirmPassword}</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={onChange}
              className="w-full p-3 rounded-lg bg-gray-700/50 text-white border border-gray-600 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition"
              required
            />
          </div>
          <button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white p-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition transform hover:scale-105">
            {LABELS.submit}
          </button>
        </form>
        <p className="mt-6 text-gray-400 text-center">
          Already have an account? <Link to="/login" className="text-red-500 hover:text-orange-500 font-semibold transition">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
