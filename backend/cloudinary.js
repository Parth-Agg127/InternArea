const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer + Cloudinary storage — all uploads go into "internarea" folder
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determine resource type based on mimetype
    const isVideo = file.mimetype.startsWith("video/");
    return {
      folder: "internarea", // Dedicated folder to separate from other projects
      resource_type: isVideo ? "video" : "image",
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp", "mp4", "mov", "avi", "webm"],
      transformation: isVideo ? [] : [{ width: 1200, quality: "auto" }],
    };
  },
});

// Multer upload middleware — max 5 files, 50MB each
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 5, // Max 5 files per post
  },
});

module.exports = { cloudinary, upload };
