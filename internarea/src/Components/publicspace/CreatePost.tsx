import React, { useState, useRef } from "react";
import { ImagePlus, Video, X, Send, Loader2, Lock } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import { useTranslation } from "@/i18n/LanguageContext";

interface PostLimit {
  canPost: boolean;
  remaining: number;
  friendCount: number;
  postsToday: number;
  message: string;
}

interface CreatePostProps {
  user: any;
  postLimit: PostLimit | null;
  onPostCreated: () => void;
}

const API_URL = "https://internarea-1-n2uz.onrender.com/api";

const CreatePost = ({ user, postLimit, onPostCreated }: CreatePostProps) => {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<
    { url: string; type: string }[]
  >([]);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate the post limit message on the frontend using translation keys
  const getPostLimitMessage = () => {
    if (!postLimit) return "";
    if (postLimit.friendCount === 0) {
      return t("publicSpace.postLimitAddFriends");
    } else if (postLimit.remaining === -1) {
      return t("publicSpace.postLimitUnlimited");
    } else if (postLimit.remaining > 0) {
      return t("publicSpace.postLimitRemaining").replace("{remaining}", String(postLimit.remaining));
    } else {
      return t("publicSpace.postLimitReached");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (mediaFiles.length + files.length > 5) {
      toast.error(t("publicSpace.maxFilesError"));
      return;
    }

    const newFiles = [...mediaFiles, ...files];
    setMediaFiles(newFiles);

    // Generate previews
    const newPreviews = files.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    }));
    setMediaPreviews([...mediaPreviews, ...newPreviews]);
  };

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index].url);
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
    setMediaPreviews(mediaPreviews.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && mediaFiles.length === 0) {
      toast.error(t("publicSpace.addTextOrMedia"));
      return;
    }

    setIsPosting(true);
    try {
      const formData = new FormData();
      formData.append("firebaseUid", user.uid);
      formData.append("content", content);
      mediaFiles.forEach((file) => {
        formData.append("media", file);
      });

      await axios.post(`${API_URL}/post`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(t("publicSpace.postCreated"));
      setContent("");
      setMediaFiles([]);
      setMediaPreviews([]);
      onPostCreated();
    } catch (error: any) {
      const msg =
        error?.response?.data?.error || t("publicSpace.postFailed");
      toast.error(msg);
    } finally {
      setIsPosting(false);
    }
  };

  const canPost = postLimit?.canPost ?? false;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
      {/* User info header */}
      <div className="flex items-center gap-3 mb-4">
        {user?.photo ? (
          <img
            src={user.photo}
            alt={user.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-semibold">
              {user?.name?.charAt(0) || "U"}
            </span>
          </div>
        )}
        <div>
          <p className="font-medium text-gray-900">{user?.name}</p>
          {postLimit && (
            <p
              className={`text-xs ${
                canPost ? "text-green-600" : "text-red-500"
              }`}
            >
              {getPostLimitMessage()}
            </p>
          )}
        </div>
      </div>

      {/* Post content */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          canPost
            ? t("publicSpace.placeholder")
            : t("publicSpace.placeholderLocked")
        }
        disabled={!canPost}
        className="w-full min-h-[100px] p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
      />

      {/* Media Previews */}
      {mediaPreviews.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {mediaPreviews.map((preview, index) => (
            <div key={index} className="relative group">
              {preview.type === "image" ? (
                <img
                  src={preview.url}
                  alt={`Preview ${index + 1}`}
                  className="w-24 h-24 rounded-lg object-cover border border-gray-200"
                />
              ) : (
                <video
                  src={preview.url}
                  className="w-24 h-24 rounded-lg object-cover border border-gray-200"
                />
              )}
              <button
                onClick={() => removeMedia(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
              {preview.type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video size={20} className="text-white drop-shadow-lg" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!canPost || mediaFiles.length >= 5}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ImagePlus size={18} className="text-green-600" />
            <span className="hidden sm:inline">{t("publicSpace.photo")}</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!canPost || mediaFiles.length >= 5}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Video size={18} className="text-blue-600" />
            <span className="hidden sm:inline">{t("publicSpace.video")}</span>
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={
            !canPost || isPosting || (!content.trim() && mediaFiles.length === 0)
          }
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isPosting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {t("publicSpace.posting")}
            </>
          ) : !canPost ? (
            <>
              <Lock size={16} />
              {t("publicSpace.locked")}
            </>
          ) : (
            <>
              <Send size={16} />
              {t("publicSpace.post")}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CreatePost;
