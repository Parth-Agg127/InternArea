const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../Model/User");
const OTP = require("../Model/OTP");
const LoginHistory = require("../Model/LoginHistory");
const { parseDevice, isWithinMobileWindow, getClientIP } = require("../utils/deviceParser");

// Email transporter (reuse the same pattern as resume.js)
function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// POST /api/auth/register — Register with email and password
router.post("/register", async (req, res) => {
  const { name, email, password, phoneNumber } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Name, email, and password are required" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate a unique ID to use as firebaseUid (for compatibility with existing system)
    const uniqueId = "email_" + crypto.randomBytes(16).toString("hex");

    // Create user
    const user = new User({
      firebaseUid: uniqueId,
      name,
      email,
      password: hashedPassword,
      authProvider: "email",
      photo: "",
      phoneNumber: phoneNumber || "",
    });

    await user.save();

    // Return user data (without password)
    const userData = {
      uid: user.firebaseUid,
      name: user.name,
      email: user.email,
      photo: user.photo,
      phoneNumber: user.phoneNumber,
      authProvider: user.authProvider,
    };

    res.status(201).json(userData);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// POST /api/auth/login — Login with email and password (with device tracking + security rules)
router.post("/login", async (req, res) => {
  const { email, password, deviceInfo } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Find user by email and authProvider
    const user = await User.findOne({ email, authProvider: "email" });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // --- Device Parsing ---
    const ua = deviceInfo?.userAgent || req.headers["user-agent"] || "";
    const screenWidth = deviceInfo?.screenWidth || 0;
    const { browser, browserVersion, os, deviceType } = parseDevice(ua, screenWidth);
    const ipAddress = getClientIP(req);

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
          loginMethod: "email",
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
        loginMethod: "email",
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
            <p>A login attempt was detected from <strong>Google Chrome</strong> on <strong>${os}</strong>.</p>
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
        message: "OTP sent to your email for Chrome verification.",
      });
    }

    // --- Normal Login (non-Chrome, allowed time) ---
    // Save success login record
    await new LoginHistory({
      user: user._id,
      email: user.email,
      browser,
      browserVersion,
      os,
      deviceType,
      ipAddress,
      loginMethod: "email",
      status: "success",
    }).save();

    // Return user data (without password)
    const userData = {
      uid: user.firebaseUid,
      name: user.name,
      email: user.email,
      photo: user.photo,
      phoneNumber: user.phoneNumber,
      authProvider: user.authProvider,
    };

    res.status(200).json(userData);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

// POST /api/auth/verify-login-otp — Verify Chrome login OTP
router.post("/verify-login-otp", async (req, res) => {
  const { email, otp, loginId } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    // Find the OTP record
    const otpDoc = await OTP.findOne({
      email,
      purpose: "chrome_login",
      verified: false,
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      return res.status(400).json({ error: "OTP expired or not found. Please login again." });
    }

    // Check attempts
    if (otpDoc.attempts >= 3) {
      await OTP.deleteOne({ _id: otpDoc._id });
      // Update login record to failed
      if (loginId) {
        await LoginHistory.findByIdAndUpdate(loginId, { status: "failed" });
      }
      return res.status(400).json({ error: "Too many attempts. Please login again." });
    }

    // Increment attempts
    otpDoc.attempts += 1;
    await otpDoc.save();

    // Verify hash
    const inputHash = crypto.createHash("sha256").update(otp).digest("hex");
    if (inputHash !== otpDoc.otp) {
      return res.status(400).json({
        error: `Invalid OTP. ${3 - otpDoc.attempts} attempts remaining.`,
      });
    }

    // OTP verified — clean up
    await OTP.deleteMany({ email, purpose: "chrome_login" });

    // Update login record to success
    if (loginId) {
      await LoginHistory.findByIdAndUpdate(loginId, { status: "success" });
    }

    // Find user and return data
    let user;
    if (loginId) {
      const loginRecord = await LoginHistory.findById(loginId).populate("user");
      if (loginRecord && loginRecord.user) {
        user = loginRecord.user;
      }
    }
    
    if (!user) {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = {
      uid: user.firebaseUid,
      name: user.name,
      email: user.email,
      photo: user.photo,
      phoneNumber: user.phoneNumber,
      authProvider: user.authProvider,
    };

    res.status(200).json({
      verified: true,
      ...userData,
    });
  } catch (error) {
    console.error("Verify login OTP error:", error);
    res.status(500).json({ error: "OTP verification failed. Please try again." });
  }
});

module.exports = router;
