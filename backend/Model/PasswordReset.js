const mongoose = require("mongoose");

const PasswordResetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  resetAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient lookups by user + date
PasswordResetSchema.index({ user: 1, resetAt: -1 });

module.exports = mongoose.model("PasswordReset", PasswordResetSchema);
