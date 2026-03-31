import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

const API_URL = "https://internarea-1-n2uz.onrender.com/api";

interface FriendSidebarProps {
  user: any;
  postLimit: any;
  onFriendUpdate: () => void;
}

const FriendSidebar = ({ user, postLimit, onFriendUpdate }: FriendSidebarProps) => {
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string>("");

  useEffect(() => {
    if (user?.uid) {
      fetchFriends();
      fetchFriendRequests();
    }
  }, [user?.uid]);

  const fetchFriends = async () => {
    try {
      const res = await axios.get(`${API_URL}/friend/${user.uid}`);
      setFriends(res.data);
    } catch (error) {
      console.error("Fetch friends error:", error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/friend/requests/${user.uid}`);
      setFriendRequests(res.data);
    } catch (error) {
      console.error("Fetch requests error:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await axios.get(
        `${API_URL}/user/search/find?q=${encodeURIComponent(searchQuery)}`
      );
      // Filter out self and already-friends
      const filtered = res.data.filter(
        (u: any) =>
          u.firebaseUid !== user.uid &&
          !friends.some((f: any) => f.firebaseUid === u.firebaseUid)
      );
      setSearchResults(filtered);
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (targetUid: string) => {
    setLoadingAction(targetUid);
    try {
      const res = await axios.post(`${API_URL}/friend/request`, {
        fromUid: user.uid,
        toUid: targetUid,
      });
      if (res.data.autoAccepted) {
        toast.success("You are now friends! 🎉");
        fetchFriends();
        onFriendUpdate();
      } else {
        toast.success("Friend request sent!");
      }
      setSearchResults(searchResults.filter((u: any) => u.firebaseUid !== targetUid));
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to send request");
    } finally {
      setLoadingAction("");
    }
  };

  const acceptRequest = async (requestId: string) => {
    setLoadingAction(requestId);
    try {
      await axios.put(`${API_URL}/friend/accept/${requestId}`, {
        firebaseUid: user.uid,
      });
      toast.success("Friend request accepted! 🎉");
      fetchFriends();
      fetchFriendRequests();
      onFriendUpdate();
    } catch (error) {
      toast.error("Failed to accept request");
    } finally {
      setLoadingAction("");
    }
  };

  const rejectRequest = async (requestId: string) => {
    setLoadingAction(requestId);
    try {
      await axios.put(`${API_URL}/friend/reject/${requestId}`, {
        firebaseUid: user.uid,
      });
      toast.info("Friend request rejected");
      fetchFriendRequests();
    } catch (error) {
      toast.error("Failed to reject request");
    } finally {
      setLoadingAction("");
    }
  };

  const removeFriend = async (friendUid: string) => {
    if (!confirm("Remove this friend?")) return;
    setLoadingAction(friendUid);
    try {
      await axios.delete(`${API_URL}/friend/remove`, {
        data: { userUid: user.uid, friendUid },
      });
      toast.info("Friend removed");
      fetchFriends();
      onFriendUpdate();
    } catch (error) {
      toast.error("Failed to remove friend");
    } finally {
      setLoadingAction("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile summary card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-3 mb-3">
          {user?.photo ? (
            <img
              src={user.photo}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">
                {user?.name?.charAt(0) || "U"}
              </span>
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-blue-600">{friends.length}</p>
            <p className="text-[10px] text-blue-600 font-medium">Friends</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-green-600">
              {postLimit?.remaining === -1 ? "∞" : postLimit?.remaining ?? 0}
            </p>
            <p className="text-[10px] text-green-600 font-medium">Posts Left</p>
          </div>
        </div>
      </div>

      {/* Friend Requests */}
      {friendRequests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <UserPlus size={16} className="text-blue-600" />
            Friend Requests ({friendRequests.length})
          </h3>
          <div className="space-y-2">
            {friendRequests.map((request: any) => (
              <div
                key={request._id}
                className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5"
              >
                <div className="flex items-center gap-2">
                  {request.from?.photo ? (
                    <img
                      src={request.from.photo}
                      alt={request.from.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-600 text-xs font-semibold">
                        {request.from?.name?.charAt(0) || "U"}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-800 truncate max-w-[100px]">
                    {request.from?.name}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => acceptRequest(request._id)}
                    disabled={loadingAction === request._id}
                    className="p-1.5 bg-green-100 text-green-600 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
                    title="Accept"
                  >
                    <UserCheck size={14} />
                  </button>
                  <button
                    onClick={() => rejectRequest(request._id)}
                    disabled={loadingAction === request._id}
                    className="p-1.5 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
                    title="Reject"
                  >
                    <UserX size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Find Friends */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Search size={16} className="text-blue-600" />
          Find Friends
        </h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by name..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((result: any) => (
              <div
                key={result._id}
                className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5"
              >
                <div className="flex items-center gap-2">
                  {result.photo ? (
                    <img
                      src={result.photo}
                      alt={result.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-600 text-xs font-semibold">
                        {result.name?.charAt(0) || "U"}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-800 truncate max-w-[100px]">
                    {result.name}
                  </span>
                </div>
                <button
                  onClick={() => sendFriendRequest(result.firebaseUid)}
                  disabled={loadingAction === result.firebaseUid}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loadingAction === result.firebaseUid ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <UserPlus size={12} />
                  )}
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Friends List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <button
          onClick={() => setShowFriends(!showFriends)}
          className="w-full flex items-center justify-between text-sm font-semibold text-gray-900"
        >
          <span className="flex items-center gap-2">
            <Users size={16} className="text-blue-600" />
            My Friends ({friends.length})
          </span>
          {showFriends ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showFriends && (
          <div className="mt-3 space-y-2">
            {friends.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No friends yet. Search and add friends above!
              </p>
            ) : (
              friends.map((friend: any) => (
                <div
                  key={friend._id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5"
                >
                  <div className="flex items-center gap-2">
                    {friend.photo ? (
                      <img
                        src={friend.photo}
                        alt={friend.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-600 text-xs font-semibold">
                          {friend.name?.charAt(0) || "U"}
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-800 truncate max-w-[100px]">
                      {friend.name}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFriend(friend.firebaseUid)}
                    disabled={loadingAction === friend.firebaseUid}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                    title="Remove friend"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendSidebar;
