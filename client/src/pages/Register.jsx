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
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-white text-center">{LABELS.title}</h2>
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-400 mb-2">{LABELS.username}</label>
            <input
              id="username"
              type="text"
              name="username"
              value={username}
              onChange={onChange}
              className="w-full p-2 rounded bg-gray-700 text-white"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-400 mb-2">{LABELS.email}</label>
            <input
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={onChange}
              className="w-full p-2 rounded bg-gray-700 text-white"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-400 mb-2">{LABELS.password}</label>
            <input
              id="password"
              type="password"
              name="password"
              value={password}
              onChange={onChange}
              className="w-full p-2 rounded bg-gray-700 text-white"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-gray-400 mb-2">{LABELS.confirmPassword}</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={onChange}
              className="w-full p-2 rounded bg-gray-700 text-white"
              required
            />
          </div>
          <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            {LABELS.submit}
        </form>
        <p className="mt-4 text-gray-400 text-center">
          Already have an account? <Link to="/login" className="text-blue-500">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
