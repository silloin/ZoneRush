import axios from 'axios';

/**
 * Social Service - Centralized API layer for social features.
 * This handles validation and sanitization to prevent SSRF and other injection attacks.
 */

const isSafeId = (id) => {
  const n = parseInt(id, 10);
  return Number.isInteger(n) && n > 0;
};

const sanitizeText = (text, maxLength = 500) => {
  if (typeof text !== 'string') throw new Error('Invalid input');
  const trimmed = text.trim().slice(0, maxLength);
  if (!trimmed) throw new Error('Empty input');
  return trimmed;
};

const SocialService = {
  // Feed
  getFeed: async () => {
    return axios.get('/social/feed');
  },

  // Posts
  createPost: async (caption, runId) => {
    return axios.post('/social/posts', {
      caption: sanitizeText(caption, 1000),
      runId: runId ? parseInt(runId, 10) : null
    });
  },

  updatePost: async (postId, caption) => {
    if (!isSafeId(postId)) throw new Error('Invalid post ID');
    return axios.put(`/social/posts/${postId}`, {
      caption: sanitizeText(caption, 1000)
    });
  },

  deletePost: async (postId) => {
    if (!isSafeId(postId)) throw new Error('Invalid post ID');
    return axios.delete(`/social/posts/${postId}`);
  },

  // Likes
  likePost: async (postId) => {
    if (!isSafeId(postId)) throw new Error('Invalid post ID');
    return axios.post(`/social/like/${postId}`);
  },

  unlikePost: async (postId) => {
    if (!isSafeId(postId)) throw new Error('Invalid post ID');
    return axios.delete(`/social/like/${postId}`);
  },

  // Comments
  addComment: async (postId, text) => {
    if (!isSafeId(postId)) throw new Error('Invalid post ID');
    return axios.post(`/social/comment/${postId}`, {
      text: sanitizeText(text)
    });
  },

  getComments: async (postId) => {
    if (!isSafeId(postId)) throw new Error('Invalid post ID');
    return axios.get(`/social/comments/${postId}`);
  },

  updateComment: async (commentId, text) => {
    if (!isSafeId(commentId)) throw new Error('Invalid comment ID');
    return axios.put(`/social/comments/${commentId}`, {
      text: sanitizeText(text)
    });
  },

  deleteComment: async (commentId) => {
    if (!isSafeId(commentId)) throw new Error('Invalid comment ID');
    return axios.delete(`/social/comments/${commentId}`);
  }
};

export default SocialService;
