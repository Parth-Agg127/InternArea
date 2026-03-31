import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import CreatePost from "@/Components/publicspace/CreatePost";
import PostCard from "@/Components/publicspace/PostCard";
import FriendSidebar from "@/Components/publicspace/FriendSidebar";
import { Users, LogIn, Loader2, Filter } from "lucide-react";
import Link from "next/link";

const API_URL = "https://internarea-1-n2uz.onrender.com/api";

const PublicSpace = () => {
  const user = useSelector(selectuser);
  const [posts, setPosts] = useState<any[]>([]);
  const [postLimit, setPostLimit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const fetchPosts = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/post?page=${page}&limit=20`);
      setPosts(res.data.posts);
      setTotalPages(res.data.totalPages);
      setCurrentPage(res.data.currentPage);
    } catch (error) {
      console.error("Fetch posts error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPostLimit = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const res = await axios.get(`${API_URL}/user/${user.uid}/postlimit`);
      setPostLimit(res.data);
    } catch (error) {
      console.error("Fetch post limit error:", error);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    fetchPostLimit();
  }, [fetchPostLimit]);

  const handlePostCreated = () => {
    fetchPosts(1);
    fetchPostLimit();
  };

  const handlePostUpdated = (updatedPost: any) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
    );
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
    fetchPostLimit();
  };

  const handleFriendUpdate = () => {
    fetchPostLimit();
  };

  // Not logged in state
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={32} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Public Space
          </h1>
          <p className="text-gray-600 mb-6">
            Connect with the community, share photos and videos, and engage with
            other users. Login to get started!
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <LogIn size={18} />
            Login to Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Public Space</h1>
          <p className="text-gray-600 text-sm mt-1">
            Share, connect, and engage with the community
          </p>
        </div>

        {/* Mobile sidebar toggle */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="w-full flex items-center justify-center gap-2 bg-white p-3 rounded-lg shadow-sm text-gray-700 font-medium"
          >
            <Users size={18} />
            {showMobileSidebar ? "Hide" : "Show"} Friends & Profile
          </button>
        </div>

        {/* Mobile sidebar overlay */}
        {showMobileSidebar && (
          <div className="lg:hidden fixed inset-0 bg-black/50 z-50">
            <div className="bg-gray-50 h-full w-full max-w-sm ml-auto p-4 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Friends & Profile
                </h2>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  ✕
                </button>
              </div>
              <FriendSidebar
                user={user}
                postLimit={postLimit}
                onFriendUpdate={handleFriendUpdate}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Desktop sidebar — left */}
          <div className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-6">
              <FriendSidebar
                user={user}
                postLimit={postLimit}
                onFriendUpdate={handleFriendUpdate}
              />
            </div>
          </div>

          {/* Main feed */}
          <div className="flex-1 max-w-2xl">
            {/* Create post */}
            <CreatePost
              user={user}
              postLimit={postLimit}
              onPostCreated={handlePostCreated}
            />

            {/* Posts feed */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2
                  size={32}
                  className="animate-spin text-blue-600"
                />
                <span className="ml-3 text-gray-600">Loading feed...</span>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No posts yet
                </h3>
                <p className="text-gray-500">
                  Be the first to share something with the community! Add
                  friends and start posting.
                </p>
              </div>
            ) : (
              <>
                {posts.map((post: any) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    currentUser={user}
                    onPostUpdated={handlePostUpdated}
                    onPostDeleted={handlePostDeleted}
                  />
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6 mb-8">
                    <button
                      onClick={() => fetchPosts(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => fetchPosts(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicSpace;
