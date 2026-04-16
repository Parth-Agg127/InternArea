const mongoose = require("mongoose");

const ResumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Resume content fields
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    default: "",
  },
  address: {
    type: String,
    default: "",
  },
  photoUrl: {
    type: String,
    default: "",
  },
  summary: {
    type: String,
    default: "",
  },
  qualifications: [
    {
      degree: String,
      institution: String,
      year: String,
      grade: String,
    },
  ],
  experience: [
    {
      title: String,
      company: String,
      duration: String,
      description: String,
    },
  ],
  skills: [String],
  projects: [
    {
      name: String,
      description: String,
      link: String,
    },
  ],
  certifications: [String],
  // Generated output
  resumePdfUrl: {
    type: String,
    default: "",
  },
  // Payment & verification
  paymentId: {
    type: String,
    default: "",
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Resume", ResumeSchema);
