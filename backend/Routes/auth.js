const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../Model/User");

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

// POST /api/auth/login — Login with email and password
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

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

module.exports = router;
