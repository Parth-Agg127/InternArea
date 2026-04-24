import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import CreatePost from "@/Components/publicspace/CreatePost";
import PostCard from "@/Components/publicspace/PostCard";
import FriendSidebar from "@/Components/publicspace/FriendSidebar";
import { Users, LogIn, Loader2, Filter } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";

const API_URL = "https://internarea-1-n2uz.onrender.com/api";

const PublicSpace = () => {
  const user = useSelector(selectuser);
  const { t } = useTranslation();
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
            {t("publicSpace.welcomeTitle")}
          </h1>
          <p className="text-gray-600 mb-6">
            {t("publicSpace.welcomeDesc")}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <LogIn size={18} />
            {t("publicSpace.loginToContinue")}
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
          <h1 className="text-2xl font-bold text-gray-900">{t("publicSpace.pageTitle")}</h1>
          <p className="text-gray-600 text-sm mt-1">
            {t("publicSpace.pageSubtitle")}
          </p>
        </div>

        {/* Mobile sidebar toggle */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="w-full flex items-center justify-center gap-2 bg-white p-3 rounded-lg shadow-sm text-gray-700 font-medium"
          >
            <Users size={18} />
            {showMobileSidebar ? t("publicSpace.hideFriends") : t("publicSpace.showFriends")} {t("publicSpace.friendsAndProfile")}
          </button>
        </div>

        {/* Mobile sidebar overlay */}
        {showMobileSidebar && (
          <div className="lg:hidden fixed inset-0 bg-black/50 z-50">
            <div className="bg-gray-50 h-full w-full max-w-sm ml-auto p-4 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {t("publicSpace.friendsAndProfile")}
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
                <span className="ml-3 text-gray-600">{t("publicSpace.loadingFeed")}</span>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("publicSpace.noPostsYet")}
                </h3>
                <p className="text-gray-500">
                  {t("publicSpace.noPostsDesc")}
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
                      {t("publicSpace.previous")}
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-600">
                      {t("publicSpace.page")} {currentPage} {t("publicSpace.of")} {totalPages}
                    </span>
                    <button
                      onClick={() => fetchPosts(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("publicSpace.next")}
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
