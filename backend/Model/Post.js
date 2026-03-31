const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    default: "",
  },
  media: [
    {
      url: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        enum: ["image", "video"],
        required: true,
      },
      publicId: {
        type: String,
        required: true,
      },
    },
  ],
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  comments: [
    {
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      text: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  shares: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Post", PostSchema);
