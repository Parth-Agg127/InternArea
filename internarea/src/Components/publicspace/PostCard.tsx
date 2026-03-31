import React, { useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

const API_URL = "https://internarea-1-n2uz.onrender.com/api";

interface PostCardProps {
  post: any;
  currentUser: any;
  onPostUpdated: (updatedPost: any) => void;
  onPostDeleted: (postId: string) => void;
}

const PostCard = ({
  post,
  currentUser,
  onPostUpdated,
  onPostDeleted,
}: PostCardProps) => {
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLiked = post.likes?.some(
    (like: any) => like.firebaseUid === currentUser?.uid
  );

  const isAuthor = post.author?.firebaseUid === currentUser?.uid;

  const handleLike = async () => {
    if (!currentUser) {
      toast.error("Please login to like posts");
      return;
    }
    setIsLiking(true);
    try {
      const res = await axios.put(`${API_URL}/post/${post._id}/like`, {
        firebaseUid: currentUser.uid,
      });
      onPostUpdated(res.data);
    } catch (error) {
      toast.error("Failed to like post");
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async () => {
    if (!currentUser) {
      toast.error("Please login to comment");
      return;
    }
    if (!commentText.trim()) return;

    setIsCommenting(true);
    try {
      const res = await axios.post(`${API_URL}/post/${post._id}/comment`, {
        firebaseUid: currentUser.uid,
        text: commentText,
      });
      onPostUpdated(res.data);
      setCommentText("");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setIsCommenting(false);
    }
  };

  const handleShare = async () => {
    try {
      // Copy link to clipboard
      const postUrl = `${window.location.origin}/publicspace?post=${post._id}`;
      await navigator.clipboard.writeText(postUrl);
      toast.success("Link copied to clipboard!");

      // Increment share count on backend
      const res = await axios.put(`${API_URL}/post/${post._id}/share`);
      onPostUpdated(res.data);
    } catch (error) {
      toast.error("Failed to share post");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    setIsDeleting(true);
    try {
      await axios.delete(`${API_URL}/post/${post._id}`, {
        data: { firebaseUid: currentUser.uid },
      });
      toast.success("Post deleted");
      onPostDeleted(post._id);
    } catch (error) {
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
      {/* Author header */}
      <div className="p-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {post.author?.photo ? (
            <img
              src={post.author.photo}
              alt={post.author.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-semibold">
                {post.author?.name?.charAt(0) || "U"}
              </span>
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900 text-sm">
              {post.author?.name || "Unknown User"}
            </p>
            <p className="text-xs text-gray-500">
              {formatTime(post.createdAt)}
            </p>
          </div>
        </div>

        {isAuthor && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete post"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
        </div>
      )}

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div
          className={`${
            post.media.length === 1
              ? ""
              : "grid grid-cols-2 gap-0.5"
          }`}
        >
          {post.media.map((media: any, index: number) => (
            <div key={index} className="relative">
              {media.type === "image" ? (
                <img
                  src={media.url}
                  alt={`Post media ${index + 1}`}
                  className="w-full max-h-[500px] object-cover"
                  loading="lazy"
                />
              ) : (
                <video
                  src={media.url}
                  controls
                  className="w-full max-h-[500px] object-cover bg-black"
                  preload="metadata"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats bar */}
      <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-500 border-b border-gray-100">
        <span>
          {post.likes?.length || 0}{" "}
          {post.likes?.length === 1 ? "like" : "likes"}
        </span>
        <div className="flex gap-3">
          <span>
            {post.comments?.length || 0} comments
          </span>
          <span>{post.shares || 0} shares</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-1 flex items-center justify-around border-b border-gray-100">
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-lg transition-colors text-sm font-medium ${
            isLiked
              ? "text-red-500 hover:bg-red-50"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Heart
            size={18}
            className={isLiked ? "fill-red-500" : ""}
          />
          Like
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 py-2.5 px-4 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium"
        >
          <MessageCircle size={18} />
          Comment
          {showComments ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 py-2.5 px-4 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium"
        >
          <Share2 size={18} />
          Share
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="px-4 py-3">
          {/* Comment list */}
          {post.comments && post.comments.length > 0 && (
            <div className="space-y-3 mb-3 max-h-64 overflow-y-auto">
              {post.comments.map((comment: any, index: number) => (
                <div key={index} className="flex gap-2">
                  {comment.author?.photo ? (
                    <img
                      src={comment.author.photo}
                      alt={comment.author.name}
                      className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-gray-500 text-xs font-semibold">
                        {comment.author?.name?.charAt(0) || "U"}
                      </span>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg px-3 py-2 flex-1">
                    <p className="text-xs font-medium text-gray-900">
                      {comment.author?.name || "Unknown"}
                    </p>
                    <p className="text-sm text-gray-700">{comment.text}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {formatTime(comment.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add comment input */}
          {currentUser && (
            <div className="flex gap-2">
              {currentUser?.photo ? (
                <img
                  src={currentUser.photo}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-blue-600 text-xs font-semibold">
                    {currentUser?.name?.charAt(0) || "U"}
                  </span>
                </div>
              )}
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleComment();
                    }
                  }}
                  placeholder="Write a comment..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
                <button
                  onClick={handleComment}
                  disabled={isCommenting || !commentText.trim()}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostCard;
