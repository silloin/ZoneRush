import React from 'react';
import { Heart, MessageSquare, Share2, Edit2, Trash2, Clock, Send, UserPlus } from 'lucide-react';
import SendFriendRequestButton from './Chat/SendFriendRequestButton';

const PostCard = ({ post, currentUser, onLike, onComment, onDelete, onUpdate, commentText, setCommentText, onUpdateComment, onDeleteComment, isLikePending }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editCaption, setEditCaption] = React.useState(post.caption);
  const [editingCommentId, setEditingCommentId] = React.useState(null);
  const [editCommentText, setEditCommentText] = React.useState('');
  const [showComments, setShowComments] = React.useState(false);
  const isOwner = currentUser && post.user_id === currentUser.id;

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/feed?postId=${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ZoneRush Post by ${post.username}`,
          text: post.caption,
          url: postUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(postUrl);
      alert('Link copied to clipboard!');
    }
  };

  const handleUpdate = async () => {
    await onUpdate(post.id, editCaption);
    setIsEditing(false);
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.text || comment.comment_text || '');
  };

  const handleSaveComment = async (commentId) => {
    if (!editCommentText.trim()) return;
    await onUpdateComment(commentId, editCommentText);
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Delete this comment?')) {
      await onDeleteComment(commentId, post.id);
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 shadow-lg backdrop-blur-sm hover:border-gray-600/50 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
            {post.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-bold text-gray-100">{post.username}</p>
            <p className="flex items-center text-xs text-gray-400 space-x-1">
              <Clock size={11} className="mr-1" />
              {new Date(post.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Friend Request Button - only show for other users' posts */}
          {!isOwner && currentUser && (
            <SendFriendRequestButton
              targetUserId={post.user_id}
              targetUsername={post.username}
              size="small"
            />
          )}
          {isOwner && (
            <div className="flex space-x-1">
              <button onClick={() => setIsEditing(!isEditing)} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-full transition-colors">
                <Edit2 size={16} />
              </button>
              <button onClick={() => onDelete(post.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="mb-4 space-y-2">
          <textarea
            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end space-x-2">
            <button onClick={() => setIsEditing(false)} className="px-4 py-1.5 text-sm text-gray-400 hover:text-gray-100 transition">Cancel</button>
            <button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition">Save</button>
          </div>
        </div>
      ) : (
        <p className="text-gray-200 mb-4 whitespace-pre-wrap leading-relaxed">{post.caption}</p>
      )}

      {/* Run Stats (optional) */}
      {post.distance && (
        <div className="bg-gray-900/60 rounded-xl p-3 mb-4 grid grid-cols-2 gap-3 border border-gray-700/30">
          <div className="flex flex-col items-center bg-gray-800/40 rounded-lg p-2">
            <span className="text-xs text-blue-400 uppercase tracking-wider mb-1">Distance</span>
            <span className="text-lg font-bold text-gray-100">{post.distance} <span className="text-sm font-normal text-gray-400">km</span></span>
          </div>
          <div className="flex flex-col items-center bg-gray-800/40 rounded-lg p-2">
            <span className="text-xs text-blue-400 uppercase tracking-wider mb-1">Duration</span>
            <span className="text-lg font-bold text-gray-100">{Math.floor(post.duration / 60)}<span className="text-sm font-normal text-gray-400">m</span> {post.duration % 60}<span className="text-sm font-normal text-gray-400">s</span></span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-6 py-3 border-t border-gray-700/50">
        <button
          onClick={() => onLike(post.id, post.is_liked)}
          disabled={isLikePending}
          className={`flex items-center space-x-1.5 transition-all ${isLikePending ? 'opacity-50 cursor-not-allowed' : ''} ${post.is_liked ? 'text-rose-500 font-bold' : 'text-gray-400 hover:text-rose-500'}`}
        >
          <Heart size={18} fill={post.is_liked ? 'currentColor' : 'none'} />
          <span className="text-sm">{post.likes || 0}</span>
        </button>
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex items-center space-x-1.5 text-gray-400 hover:text-blue-400 transition-colors"
        >
          <MessageSquare size={18} />
          <span className="text-sm">{Array.isArray(post.commentsList) ? post.commentsList.length : (post.comments || 0)}</span>
        </button>
        <button 
          onClick={handleShare}
          className="flex items-center space-x-1.5 text-gray-400 hover:text-green-400 transition-colors"
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Comment Input */}
      <div className="mt-3 flex items-center space-x-3">
        <div className="w-8 h-8 bg-gray-700 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-300">
          {currentUser?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Write a comment..."
            value={commentText[post.id] || ''}
            onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && onComment(post.id)}
            className="w-full bg-gray-900 border border-gray-700 rounded-full px-4 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 pr-10 transition-all"
          />
          <button onClick={() => onComment(post.id)} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-400 transition-colors">
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* Comments List */}
      {showComments && post.commentsList && post.commentsList.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-gray-700/50 pt-4">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Comments ({post.commentsList.length})</h4>
          {post.commentsList.map(comment => {
            console.log('🎨 Rendering comment:', comment);
            const isCommentOwner = currentUser && comment.user_id === currentUser.id;
            
            return (
              <div key={comment.id} className="flex items-start space-x-3 group">
                <div className="w-7 h-7 bg-gray-700 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-300">
                  {comment.username?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1">
                  {editingCommentId === comment.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveComment(comment.id)}
                        className="w-full bg-gray-900 border border-blue-500 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSaveComment(comment.id)}
                          className="px-3 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditCommentText('');
                          }}
                          className="px-3 py-1 text-xs font-bold bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-bold text-blue-400">{comment.username || 'User'}</span>
                        </p>
                        <p className="text-gray-300 text-sm mt-1">{comment.text || comment.comment_text || '(empty comment)'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                      </div>
                      {isCommentOwner && (
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <button
                            onClick={() => handleEditComment(comment)}
                            className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-full transition-colors"
                            title="Edit comment"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                            title="Delete comment"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PostCard;
