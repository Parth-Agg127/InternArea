const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../Model/User");
const Post = require("../Model/Post");
const OTP = require("../Model/OTP");
const LoginHistory = require("../Model/LoginHistory");
const { parseDevice, isWithinMobileWindow, getClientIP } = require("../utils/deviceParser");

// Email transporter
function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// POST /api/user/sync — Create or update user from Firebase data (with device tracking + security rules)
router.post("/sync", async (req, res) => {
  const { firebaseUid, name, email, photo, phoneNumber, deviceInfo } = req.body;

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

    // --- Device Parsing ---
    const ua = deviceInfo?.userAgent || "";
    const screenWidth = deviceInfo?.screenWidth || 0;
    const { browser, browserVersion, os, deviceType } = parseDevice(ua, screenWidth);
    const ipAddress = getClientIP(req);

    // Only apply security rules if deviceInfo was provided (skip for initial page-load syncs without device info)
    if (deviceInfo) {
      // --- Mobile Time Restriction ---
      if (deviceType === "mobile") {
        if (!isWithinMobileWindow()) {
          // Save blocked login record
          await new LoginHistory({
            user: user._id,
            email: user.email,
            browser,
            browserVersion,
            os,
            deviceType,
            ipAddress,
            loginMethod: "google",
            status: "blocked_time",
            blockedReason: "Mobile login is only allowed between 10:00 AM and 1:00 PM IST",
          }).save();

          return res.status(403).json({
            error: "Mobile login is only allowed between 10:00 AM and 1:00 PM IST",
            blockedReason: "mobile_time_restriction",
          });
        }
      }

      // --- Chrome OTP Requirement ---
      if (browser === "Chrome") {
        // Delete any existing login OTPs for this email
        await OTP.deleteMany({ email: user.email, purpose: "chrome_login" });

        // Generate 6-digit OTP
        const otpPlain = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = crypto.createHash("sha256").update(otpPlain).digest("hex");

        // Store OTP with 5 minute expiry
        await new OTP({
          email: user.email,
          otp: otpHash,
          purpose: "chrome_login",
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        }).save();

        // Save pending login record
        const loginRecord = await new LoginHistory({
          user: user._id,
          email: user.email,
          browser,
          browserVersion,
          os,
          deviceType,
          ipAddress,
          loginMethod: "google",
          status: "pending_otp",
          chromeOtpRequired: true,
        }).save();

        // Send OTP email
        const transporter = getTransporter();
        await transporter.sendMail({
          from: `"InternArea Security" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: "Chrome Login Verification OTP - InternArea",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px;">
              <h2 style="color: #2563eb;">🔐 Chrome Login Verification</h2>
              <p>A Google sign-in attempt was detected from <strong>Google Chrome</strong> on <strong>${os}</strong>.</p>
              <p>Your one-time verification code is:</p>
              <div style="background: #f0f9ff; border: 2px solid #2563eb; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af;">${otpPlain}</span>
              </div>
              <p style="color: #666;">This code expires in <strong>5 minutes</strong>.</p>
              <p style="color: #999; font-size: 12px;">If you didn't attempt to log in, please ignore this email and secure your account.</p>
            </div>
          `,
        });

        return res.status(200).json({
          requiresOTP: true,
          loginId: loginRecord._id,
          email: user.email,
          user: user,
          message: "OTP sent to your email for Chrome verification.",
        });
      }

      // --- Normal Login (non-Chrome, allowed time) — save success record ---
      await new LoginHistory({
        user: user._id,
        email: user.email,
        browser,
        browserVersion,
        os,
        deviceType,
        ipAddress,
        loginMethod: "google",
        status: "success",
      }).save();
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

// GET /api/user/:firebaseUid/login-history — Get user's login history
router.get("/:firebaseUid/login-history", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const loginHistory = await LoginHistory.find({ user: user._id })
      .sort({ timestamp: -1 })
      .limit(20)
      .select("-__v");

    res.status(200).json(loginHistory);
  } catch (error) {
    console.error("Get login history error:", error);
    res.status(500).json({ error: "Failed to get login history" });
  }
});

module.exports = router;
