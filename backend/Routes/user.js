const express = require("express");
const router = express.Router();
const User = require("../Model/User");
const Post = require("../Model/Post");

// POST /api/user/sync — Create or update user from Firebase data
router.post("/sync", async (req, res) => {
  const { firebaseUid, name, email, photo, phoneNumber } = req.body;

  if (!firebaseUid || !email) {
    return res.status(400).json({ error: "firebaseUid and email are required" });
  }

  try {
    let user = await User.findOne({ firebaseUid });

    if (user) {
      // Update existing user
      user.name = name || user.name;
      user.email = email || user.email;
      user.photo = photo || user.photo;
      user.phoneNumber = phoneNumber || user.phoneNumber;
      await user.save();
    } else {
      // Create new user
      user = new User({
        firebaseUid,
        name: name || "User",
        email,
        photo: photo || "",
        phoneNumber: phoneNumber || "",
      });
      await user.save();
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("User sync error:", error);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

// GET /api/user/:firebaseUid — Get user profile with friend count
router.get("/:firebaseUid", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid })
      .populate("friends", "name email photo firebaseUid")
      .populate("friendRequests.from", "name email photo firebaseUid");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// GET /api/user/search?q=name — Search users by name
router.get("/search/find", async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length < 1) {
    return res.status(400).json({ error: "Search query is required" });
  }

  try {
    const users = await User.find({
      name: { $regex: q, $options: "i" },
    })
      .select("name email photo firebaseUid friends")
      .limit(20);

    res.status(200).json(users);
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({ error: "Failed to search users" });
  }
});

// GET /api/user/:firebaseUid/postlimit — Get remaining posts for today
router.get("/:firebaseUid/postlimit", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const friendCount = user.friends.length;

    // Count posts created today by this user
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const postsToday = await Post.countDocuments({
      author: user._id,
      createdAt: { $gte: startOfToday },
    });

    let canPost = false;
    let remaining = 0;
    let message = "";

    if (friendCount === 0) {
      canPost = false;
      remaining = 0;
      message = "Add friends to start posting! Connect with people to unlock posting.";
    } else if (friendCount >= 10) {
      canPost = true;
      remaining = -1; // -1 means unlimited
      message = "Unlimited posting unlocked! 🎉";
    } else {
      // 1-9 friends: can post friendCount times per day
      const limit = friendCount;
      remaining = Math.max(0, limit - postsToday);
      canPost = remaining > 0;
      message = canPost
        ? `You have ${remaining} post${remaining === 1 ? "" : "s"} remaining today.`
        : "Daily limit reached! Add more friends to increase your limit.";
    }

    res.status(200).json({
      canPost,
      remaining,
      friendCount,
      postsToday,
      message,
    });
  } catch (error) {
    console.error("Post limit error:", error);
    res.status(500).json({ error: "Failed to check post limit" });
  }
});

// GET /api/user/:firebaseUid/subscription — Get user's subscription info
router.get("/:firebaseUid/subscription", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const planLimits = {
      Free: 1,
      Bronze: 3,
      Silver: 5,
      Gold: Infinity,
    };

    const currentPlan = user.currentPlan || "Free";

    res.status(200).json({
      currentPlan,
      applicationsUsedThisMonth: user.applicationsUsedThisMonth || 0,
      planExpiryDate: user.planExpiryDate || null,
      maxApplications: planLimits[currentPlan] || 1,
    });
  } catch (error) {
    console.error("Get subscription info error:", error);
    res.status(500).json({ error: "Failed to get subscription info" });
  }
});

module.exports = router;
