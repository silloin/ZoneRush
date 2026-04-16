import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { X, MapPin, Plus } from 'lucide-react';
import PostCard from './PostCard';
import SocialService from '../services/socialService';

const SocialFeed = () => {
  const { user } = useContext(AuthContext);
  const [feed, setFeed] = useState([]);
  const [runs, setRuns] = useState([]);
  const [commentText, setCommentText] = useState({});
  const [newPost, setNewPost] = useState({ caption: '', runId: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingLikes, setPendingLikes] = useState(new Set()); // Track posts with pending like operations

  useEffect(() => {
    fetchFeed();
    if (user) {
      fetchUserRuns();
    }
  }, [user]);

  const fetchFeed = async () => {
    setIsLoading(true);
    try {
      const res = await SocialService.getFeed();
      const feedData = Array.isArray(res.data) ? res.data : [];
      
      // Fetch comments for each post
      const feedWithComments = await Promise.all(
        feedData.map(async (post) => {
          try {
            const commentsRes = await SocialService.getComments(post.id);
            const comments = Array.isArray(commentsRes.data) ? commentsRes.data : [];
            if (comments.length > 0) {
              console.log(`📥 Post ${post.id} comments:`, comments.map(c => ({ id: c.id, text: c.text?.substring(0, 20) })));
            }
            return {
              ...post,
              commentsList: comments
            };
          } catch (err) {
            console.error(`Error fetching comments for post ${post.id}:`, err);
            return {
              ...post,
              commentsList: []
            };
          }
        })
      );
      
      setFeed(feedWithComments);
    } catch (err) {
      console.error('Error fetching feed:', err);
      setFeed([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserRuns = async () => {
    try {
      const res = await axios.get('/runs');
      setRuns(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching runs:', err);
      setRuns([]);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      await SocialService.createPost(newPost.caption, newPost.runId);
      setNewPost({ caption: '', runId: '' });
      setIsCreating(false);
      fetchFeed();
    } catch (err) {
      console.error('Error creating post:', err);
    }
  };

  const handleUpdatePost = async (postId, caption) => {
    try {
      await SocialService.updatePost(postId, caption);
      fetchFeed();
    } catch (err) {
      console.error('Error updating post:', err);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await SocialService.deletePost(postId);
      // Instead of fetchFeed() which resets entire state:
      setFeed(prev => prev.filter(post => post.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  const handleLike = async (postId, isLiked) => {
    // Prevent duplicate likes while API call is in progress
    if (pendingLikes.has(postId)) return;
    
    try {
      setPendingLikes(prev => new Set([...prev, postId])); // Mark as pending
      
      if (isLiked) {
        await SocialService.unlikePost(postId);
      } else {
        await SocialService.likePost(postId);
      }
      
      // Update feed state locally without full refresh
      setFeed(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            is_liked: !isLiked,
            likes: isLiked ? Math.max(0, post.likes - 1) : post.likes + 1
          };
        }
        return post;
      }));
    } catch (err) {
      console.error('Error toggling like:', err);
    } finally {
      setPendingLikes(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      }); // Done processing
    }
  };

  const handleComment = async (postId) => {
    if (!commentText[postId]?.trim()) return;
    const commentContent = commentText[postId].trim();
    
    try {
      const res = await SocialService.addComment(postId, commentContent);
      console.log('📨 Comment API response:', res.data);
      
      // Clear input immediately
      setCommentText({ ...commentText, [postId]: '' });
      
      // Ensure response has the correct structure
      const newComment = {
        id: res.data.id,
        user_id: res.data.user_id,
        post_id: res.data.post_id,
        text: res.data.text || res.data.comment_text,
        comment_text: res.data.text || res.data.comment_text,
        created_at: res.data.created_at,
        username: res.data.username || user?.username || 'Unknown'
      };
      console.log('📝 Processed new comment:', newComment);
      
      // Update feed with new comment
      setFeed(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: post.comments + 1,
            commentsList: [...(post.commentsList || []), newComment]
          };
        }
        return post;
      }));
    } catch (err) {
      console.error('Error commenting:', err);
      alert('Failed to add comment. Please try again.');
    }
  };

  const handleUpdateComment = async (commentId, text) => {
    try {
      const res = await SocialService.updateComment(commentId, text);
      
      // Update comment in feed
      setFeed(prev => prev.map(post => {
        if (post.commentsList) {
          return {
            ...post,
            commentsList: post.commentsList.map(comment => 
              comment.id === commentId ? res.data : comment
            )
          };
        }
        return post;
      }));
    } catch (err) {
      console.error('Error updating comment:', err);
      alert('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId, postId) => {
    try {
      await SocialService.deleteComment(commentId);
      
      // Remove comment from feed
      setFeed(prev => prev.map(post => {
        if (post.id === postId && post.commentsList) {
          return {
            ...post,
            comments: Math.max(0, post.comments - 1),
            commentsList: post.commentsList.filter(comment => comment.id !== commentId)
          };
        }
        return post;
      }));
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Failed to delete comment');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Social Feed</h1>
            <p className="text-gray-400 mt-1">Share your progress and connect with others</p>
          </div>
          {user && (
            <button
              onClick={() => setIsCreating(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg hover:shadow-blue-500/25 flex items-center space-x-2 active:scale-95"
            >
              <Plus size={20} />
              <span>New Post</span>
            </button>
          )}
        </div>

        {/* Create Post Modal */}
        {user && isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-bold text-gray-100 flex items-center space-x-2">
                  <span className="bg-blue-500/20 text-blue-400 p-2 rounded-xl">✍️</span>
                  <span>Share your progress</span>
                </h3>
                <button onClick={() => setIsCreating(false)} className="text-gray-500 hover:text-gray-300 p-2 hover:bg-gray-700 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreatePost} className="space-y-5">
                <textarea
                  className="w-full bg-gray-900 border border-gray-700 rounded-2xl p-4 text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none resize-none min-h-[120px] transition-all"
                  placeholder="What's on your mind? Did you hit a new PR?"
                  value={newPost.caption}
                  onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })}
                  required
                  autoFocus
                />
                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-400 mb-2">
                    <MapPin size={14} className="text-blue-500" />
                    <span>Attach a Run (Optional)</span>
                  </label>
                  <select
                    className="w-full bg-gray-900 border border-gray-700 rounded-2xl p-3 text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none text-sm appearance-none cursor-pointer transition-all"
                    value={newPost.runId}
                    onChange={(e) => setNewPost({ ...newPost, runId: e.target.value })}
                  >
                    <option value="">No run attached</option>
                    {runs.map(run => (
                      <option key={run.id} value={run.id}>
                        🏃 {new Date(run.completed_at).toLocaleDateString()} — {run.distance}km in {Math.floor(run.duration / 60)}m
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsCreating(false)} className="px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-gray-100 transition-colors">
                    Discard
                  </button>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-2xl font-bold transition-all shadow-lg active:scale-95">
                    Post to Feed
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Feed List */}
        <div className="space-y-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-gray-500 font-medium">Loading your feed...</p>
            </div>
          ) : feed.length === 0 ? (
            <div className="text-center py-20 bg-gray-800/30 border border-dashed border-gray-700 rounded-3xl">
              <div className="text-5xl mb-4">🌍</div>
              <h3 className="text-xl font-bold text-gray-300">No posts yet</h3>
              <p className="text-gray-500 mt-2">Be the first to share your journey with the world!</p>
              {user && (
                <button 
                  onClick={() => setIsCreating(true)}
                  className="mt-6 text-blue-400 hover:text-blue-300 font-bold transition-colors"
                >
                  Create a post now →
                </button>
              )}
            </div>
          ) : (
            feed.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={user}
                onLike={handleLike}
                onComment={handleComment}
                onDelete={handleDeletePost}
                onUpdate={handleUpdatePost}
                onUpdateComment={handleUpdateComment}
                onDeleteComment={handleDeleteComment}
                commentText={commentText}
                setCommentText={setCommentText}
                isLikePending={pendingLikes.has(post.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialFeed;
