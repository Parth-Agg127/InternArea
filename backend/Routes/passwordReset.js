const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../Model/User");
const PasswordReset = require("../Model/PasswordReset");

/**
 * Generate a random password containing ONLY uppercase and lowercase letters.
 * No numbers, no special characters.
 * @param {number} length - Length of the password (default 10)
 * @returns {string} - Generated password
 */
function generatePassword(length = 10) {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const allChars = uppercase + lowercase;

  let password = "";

  // Guarantee at least 1 uppercase and 1 lowercase
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];

  // Fill remaining characters randomly from uppercase + lowercase
  for (let i = 2; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password so the guaranteed chars aren't always first
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

// POST /api/password-reset/reset — Reset password for email/password users
router.post("/reset", async (req, res) => {
  const { identifier, newPassword } = req.body;

  if (!identifier || !identifier.trim()) {
    return res
      .status(400)
      .json({ error: "Email or phone number is required" });
  }

  if (!newPassword || newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "New password must be at least 6 characters long" });
  }

  const trimmedIdentifier = identifier.trim();

  try {
    // Determine if identifier is email or phone
    const isEmail = trimmedIdentifier.includes("@");

    // Find user by email or phone number
    let user;
    if (isEmail) {
      user = await User.findOne({ email: trimmedIdentifier });
    } else {
      user = await User.findOne({ phoneNumber: trimmedIdentifier });
    }

    if (!user) {
      return res.status(404).json({
        error: "No account found with this " + (isEmail ? "email" : "phone number"),
      });
    }

    // Check if the user is a Google OAuth user
    if (user.authProvider === "google") {
      return res.status(400).json({
        error:
          "This account uses Google login. Please sign in with Google instead. You cannot reset a Google account password here.",
        isGoogleUser: true,
      });
    }

    // Check daily limit — has this user already reset today?
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const resetToday = await PasswordReset.findOne({
      user: user._id,
      resetAt: { $gte: startOfToday },
    });

    if (resetToday) {
      return res.status(429).json({
        error: "You can use this option only once per day.",
        dailyLimitReached: true,
      });
    }

    // Hash the new password and update the user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    // Record the reset in PasswordReset collection
    const resetRecord = new PasswordReset({
      user: user._id,
      resetAt: new Date(),
    });
    await resetRecord.save();

    // Return success to the frontend
    res.status(200).json({
      success: true,
      message: "Password has been reset successfully!",
      userName: user.name,
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

module.exports = router;
