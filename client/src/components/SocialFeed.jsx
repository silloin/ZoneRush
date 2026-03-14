import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SocialFeed = () => {
  const [feed, setFeed] = useState([]);
  const [comment, setComment] = useState({});

  useEffect(() => {
    fetchFeed();
  }, []);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return { headers: { 'x-auth-token': token } };
  };

  const fetchFeed = async () => {
    try {
      const res = await axios.get('/social/feed', getAuthConfig());
      setFeed(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setFeed([]);
    }
  };

  const handleLike = async (postId) => {
    try {
      await axios.post(`/social/like/${postId}`, {}, getAuthConfig());
      fetchFeed();
    } catch (err) {
      console.error(err);
    }
  };

  const handleComment = async (postId) => {
    try {
      await axios.post(`/social/comment/${postId}`, { text: comment[postId] }, getAuthConfig());
      setComment({ ...comment, [postId]: '' });
      fetchFeed();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Social Feed</h2>
      {feed.map((post) => (
        <div key={post.id} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center mb-2">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              {post.username[0].toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="font-bold">{post.username}</p>
              <p className="text-sm text-gray-500">
                {post.distance}km • {Math.floor(post.duration / 60)}min
              </p>
            </div>
          </div>
          <p className="mb-3">{post.caption}</p>
          <div className="flex items-center space-x-4 text-gray-600">
            <button onClick={() => handleLike(post.id)} className="flex items-center space-x-1 hover:text-red-500">
              <span>❤️</span>
              <span>{post.likes}</span>
            </button>
            <span className="flex items-center space-x-1">
              <span>💬</span>
              <span>{post.comments}</span>
            </span>
          </div>
          <div className="mt-3 flex space-x-2">
            <input
              type="text"
              placeholder="Add a comment..."
              value={comment[post.id] || ''}
              onChange={(e) => setComment({ ...comment, [post.id]: e.target.value })}
              className="flex-1 border rounded px-3 py-1"
            />
            <button onClick={() => handleComment(post.id)} className="bg-blue-500 text-white px-4 py-1 rounded">
              Post
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SocialFeed;
