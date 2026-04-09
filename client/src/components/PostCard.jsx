import React from 'react';
import { Heart, MessageSquare, Share2, Edit2, Trash2, Clock, Send, UserPlus } from 'lucide-react';
import SendFriendRequestButton from './Chat/SendFriendRequestButton';

const PostCard = ({ post, currentUser, onLike, onComment, onDelete, onUpdate, commentText, setCommentText }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editCaption, setEditCaption] = React.useState(post.caption);
  const isOwner = currentUser && post.user_id === currentUser.id;

  const handleUpdate = async () => {
    await onUpdate(post.id, editCaption);
    setIsEditing(false);
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
          className={`flex items-center space-x-1.5 transition-all ${post.is_liked ? 'text-rose-500 font-bold' : 'text-gray-400 hover:text-rose-500'}`}
        >
          <Heart size={18} fill={post.is_liked ? 'currentColor' : 'none'} />
          <span className="text-sm">{post.likes || 0}</span>
        </button>
        <button className="flex items-center space-x-1.5 text-gray-400 hover:text-blue-400 transition-colors">
          <MessageSquare size={18} />
          <span className="text-sm">{post.comments || 0}</span>
        </button>
        <button className="flex items-center space-x-1.5 text-gray-400 hover:text-green-400 transition-colors">
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
    </div>
  );
};

export default PostCard;
