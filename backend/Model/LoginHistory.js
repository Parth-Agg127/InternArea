const mongoose = require("mongoose");

const LoginHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  browser: {
    type: String,
    default: "Unknown",
  },
  browserVersion: {
    type: String,
    default: "",
  },
  os: {
    type: String,
    default: "Unknown",
  },
  deviceType: {
    type: String,
    enum: ["desktop", "mobile", "tablet"],
    default: "desktop",
  },
  ipAddress: {
    type: String,
    default: "",
  },
  loginMethod: {
    type: String,
    enum: ["google", "email"],
    default: "email",
  },
  status: {
    type: String,
    enum: ["success", "pending_otp", "failed", "blocked_time"],
    default: "success",
  },
  chromeOtpRequired: {
    type: Boolean,
    default: false,
  },
  blockedReason: {
    type: String,
    default: "",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries on user login history
LoginHistorySchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model("LoginHistory", LoginHistorySchema);
