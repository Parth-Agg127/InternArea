const express = require("express");
const router = express.Router();
const Post = require("../Model/Post");
const User = require("../Model/User");
const { upload, cloudinary } = require("../cloudinary");

// POST /api/post — Create a new post (with media upload)
router.post("/", upload.array("media", 5), async (req, res) => {
  const { firebaseUid, content } = req.body;

  if (!firebaseUid) {
    return res.status(400).json({ error: "firebaseUid is required" });
  }

  if (!content && (!req.files || req.files.length === 0)) {
    return res.status(400).json({ error: "Post must have text content or media" });
  }

  try {
    // Find the user
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ===== POST LIMIT CHECK =====
    const friendCount = user.friends.length;

    if (friendCount === 0) {
      return res.status(403).json({
        error: "You need at least 1 friend to post. Start connecting with people!",
        limitReached: true,
      });
    }

    // Count posts created today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const postsToday = await Post.countDocuments({
      author: user._id,
      createdAt: { $gte: startOfToday },
    });

    // Check limit (10+ friends = unlimited)
    if (friendCount < 10 && postsToday >= friendCount) {
      return res.status(403).json({
        error: `Daily post limit reached! You have ${friendCount} friend${friendCount === 1 ? "" : "s"}, so you can post ${friendCount} time${friendCount === 1 ? "" : "s"} per day. Add more friends to increase your limit!`,
        limitReached: true,
      });
    }
    // ===== END POST LIMIT CHECK =====

    // Process uploaded media files
    const media = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const isVideo = file.mimetype.startsWith("video/");
        media.push({
          url: file.path, // Cloudinary URL
          type: isVideo ? "video" : "image",
          publicId: file.filename, // Cloudinary public ID
        });
      }
    }

    // Create the post
    const post = new Post({
      author: user._id,
      content: content || "",
      media,
    });

    await post.save();

    // Populate author info before returning
    const populatedPost = await Post.findById(post._id)
      .populate("author", "name email photo firebaseUid")
      .populate("comments.author", "name email photo firebaseUid");

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// GET /api/post — Get all posts (public feed, newest first)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name email photo firebaseUid")
      .populate("comments.author", "name email photo firebaseUid")
      .populate("likes", "name photo firebaseUid");

    const total = await Post.countDocuments();

    res.status(200).json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total,
    });
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ error: "Failed to get posts" });
  }
});

// GET /api/post/user/:firebaseUid — Get posts by a specific user
router.get("/user/:firebaseUid", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const posts = await Post.find({ author: user._id })
      .sort({ createdAt: -1 })
      .populate("author", "name email photo firebaseUid")
      .populate("comments.author", "name email photo firebaseUid")
      .populate("likes", "name photo firebaseUid");

    res.status(200).json(posts);
  } catch (error) {
    console.error("Get user posts error:", error);
    res.status(500).json({ error: "Failed to get user posts" });
  }
});

// PUT /api/post/:id/like — Toggle like on a post
router.put("/:id/like", async (req, res) => {
  const { firebaseUid } = req.body;

  try {
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const likeIndex = post.likes.findIndex(
      (id) => id.toString() === user._id.toString()
    );

    if (likeIndex > -1) {
      // Already liked — unlike
      post.likes.splice(likeIndex, 1);
    } else {
      // Not liked — add like
      post.likes.push(user._id);
    }

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate("author", "name email photo firebaseUid")
      .populate("comments.author", "name email photo firebaseUid")
      .populate("likes", "name photo firebaseUid");

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Like post error:", error);
    res.status(500).json({ error: "Failed to like post" });
  }
});

// POST /api/post/:id/comment — Add a comment to a post
router.post("/:id/comment", async (req, res) => {
  const { firebaseUid, text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Comment text is required" });
  }

  try {
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    post.comments.push({
      author: user._id,
      text: text.trim(),
    });

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate("author", "name email photo firebaseUid")
      .populate("comments.author", "name email photo firebaseUid")
      .populate("likes", "name photo firebaseUid");

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Comment error:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// PUT /api/post/:id/share — Increment share count
router.put("/:id/share", async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { shares: 1 } },
      { new: true }
    )
      .populate("author", "name email photo firebaseUid")
      .populate("comments.author", "name email photo firebaseUid")
      .populate("likes", "name photo firebaseUid");

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(200).json(post);
  } catch (error) {
    console.error("Share post error:", error);
    res.status(500).json({ error: "Failed to share post" });
  }
});

// DELETE /api/post/:id — Delete a post (only by author)
router.delete("/:id", async (req, res) => {
  const { firebaseUid } = req.body;

  try {
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.author.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "You can only delete your own posts" });
    }

    // Delete media from Cloudinary
    for (const mediaItem of post.media) {
      try {
        const resourceType = mediaItem.type === "video" ? "video" : "image";
        await cloudinary.uploader.destroy(mediaItem.publicId, {
          resource_type: resourceType,
        });
      } catch (cloudErr) {
        console.error("Cloudinary delete error:", cloudErr);
      }
    }

    await Post.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

module.exports = router;
