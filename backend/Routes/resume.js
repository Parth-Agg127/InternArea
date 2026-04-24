const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const Razorpay = require("razorpay");
const PDFDocument = require("pdfkit");
const { cloudinary } = require("../cloudinary");
const User = require("../Model/User");
const Resume = require("../Model/Resume");
const OTP = require("../Model/OTP");

// Initialize Razorpay
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

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

// ==============================
// 1. SEND OTP
// ==============================
router.post("/send-otp", async (req, res) => {
  try {
    const { email, purpose } = req.body;
    const otpPurpose = purpose || "resume_payment";
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    // Delete any existing OTPs for this email + purpose
    await OTP.deleteMany({ email, purpose: otpPurpose });

    // Generate 6-digit OTP
    const otpPlain = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash before storing
    const otpHash = crypto.createHash("sha256").update(otpPlain).digest("hex");

    // Store in DB with 5 minute expiry
    const otpDoc = new OTP({
      email,
      otp: otpHash,
      purpose: otpPurpose,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });
    await otpDoc.save();

    // Send email
    const transporter = getTransporter();
    const emailSubject = otpPurpose === "french_language"
      ? "Language Verification OTP - InternArea"
      : "Your Resume Builder OTP - InternArea";
    const emailTitle = otpPurpose === "french_language"
      ? "French Language Verification"
      : "Resume Builder - OTP Verification";
    await transporter.sendMail({
      from: `"InternArea" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: emailSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px;">
          <h2 style="color: #2563eb;">${emailTitle}</h2>
          <p>Your one-time verification code is:</p>
          <div style="background: #f0f9ff; border: 2px solid #2563eb; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af;">${otpPlain}</span>
          </div>
          <p style="color: #666;">This code expires in <strong>5 minutes</strong>.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    res.status(200).json({ success: true, message: "OTP sent to your email." });
  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({ error: "Failed to send OTP. Please try again." });
  }
});

// ==============================
// 2. VERIFY OTP
// ==============================
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp, purpose } = req.body;
    const otpPurpose = purpose || "resume_payment";
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required." });
    }

    // Find the latest OTP for this email
    const otpDoc = await OTP.findOne({
      email,
      purpose: otpPurpose,
      verified: false,
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      return res.status(400).json({ error: "OTP expired or not found. Please request a new one." });
    }

    // Check attempts
    if (otpDoc.attempts >= 3) {
      await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ error: "Too many attempts. Please request a new OTP." });
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

    // OTP is correct — generate verification token
    const verificationToken = uuidv4();
    otpDoc.verified = true;
    otpDoc.verificationToken = verificationToken;
    // Extend expiry for the token (15 minutes for checkout)
    otpDoc.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await otpDoc.save();

    res.status(200).json({
      success: true,
      verified: true,
      verificationToken,
      message: "OTP verified successfully!",
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

// ==============================
// 3. CHECKOUT — Create Razorpay ₹50 Order
// ==============================
router.post("/checkout", async (req, res) => {
  try {
    const { userId, verificationToken } = req.body;
    if (!userId || !verificationToken) {
      return res.status(400).json({ error: "userId and verificationToken are required." });
    }

    // Validate the verification token
    const otpDoc = await OTP.findOne({
      verificationToken,
      verified: true,
      purpose: "resume_payment",
    });

    if (!otpDoc) {
      return res.status(400).json({ error: "Invalid or expired verification. Please verify OTP again." });
    }

    if (!razorpay) {
      return res.status(500).json({ error: "Razorpay is not configured on the backend." });
    }

    // Create ₹50 order (5000 paise)
    const options = {
      amount: 5000, // ₹50 in paise
      currency: "INR",
      receipt: `resume_${userId}_${Date.now()}`,
      notes: {
        userId,
        purpose: "resume_generation",
      },
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Resume Checkout Error:", error);
    res.status(500).json({ error: "Failed to create order." });
  }
});

// ==============================
// 4. PAYMENT VERIFY — Verify signature, generate PDF, save
// ==============================
router.post("/payment-verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      resumeData,
      firebaseUid,
    } = req.body;

    // Verify Razorpay signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature." });
    }

    // Find user
    let dbUser = await User.findOne({ firebaseUid });
    if (!dbUser) {
      dbUser = await User.findById(firebaseUid).catch(() => null);
    }
    if (!dbUser) {
      return res.status(404).json({ error: "User not found." });
    }

    // Generate PDF
    const pdfBuffer = await generateResumePDF(resumeData);

    // Upload PDF to Cloudinary
    const pdfUploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          folder: "internarea/resumes",
          public_id: `resume_${dbUser._id}_${Date.now()}`,
          format: "pdf",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(pdfBuffer);
    });

    const resumePdfUrl = pdfUploadResult.secure_url;

    // Save Resume document
    const resume = new Resume({
      user: dbUser._id,
      fullName: resumeData.fullName,
      email: resumeData.email,
      phone: resumeData.phone,
      address: resumeData.address,
      photoUrl: resumeData.photoUrl || "",
      summary: resumeData.summary,
      qualifications: resumeData.qualifications || [],
      experience: resumeData.experience || [],
      skills: resumeData.skills || [],
      projects: resumeData.projects || [],
      certifications: resumeData.certifications || [],
      resumePdfUrl,
      paymentId: razorpay_payment_id,
      isPaid: true,
    });
    await resume.save();

    // Update user's resumeUrl
    dbUser.resumeUrl = resumePdfUrl;
    await dbUser.save();

    // Clean up OTP records
    await OTP.deleteMany({ email: resumeData.email, purpose: "resume_payment" });

    // Send resume email
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"InternArea Resume Builder" <${process.env.EMAIL_USER}>`,
        to: resumeData.email,
        subject: "Your Professional Resume is Ready! - InternArea",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <h2 style="color: #2563eb;">🎉 Your Resume is Ready!</h2>
            <p>Hi ${resumeData.fullName},</p>
            <p>Your professional resume has been generated and attached to your InternArea profile.</p>
            <h3>Invoice Details:</h3>
            <ul>
              <li><strong>Service:</strong> Resume Generation</li>
              <li><strong>Amount Paid:</strong> ₹50</li>
              <li><strong>Payment ID:</strong> ${razorpay_payment_id}</li>
            </ul>
            <p>You can download your resume from your profile page or using the link below:</p>
            <p><a href="${resumePdfUrl}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Download Resume</a></p>
            <br/>
            <p>Best Regards,</p>
            <p>The InternArea Team</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Resume email error (non-fatal):", emailErr);
    }

    res.status(200).json({
      success: true,
      resumePdfUrl,
      message: "Resume generated and attached to your profile!",
    });
  } catch (error) {
    console.error("Payment Verify Error:", error);
    res.status(500).json({ error: "Failed to process payment and generate resume." });
  }
});

// ==============================
// 5. GET RESUME — Fetch user's resume data
// ==============================
router.get("/:firebaseUid", async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    let dbUser = await User.findOne({ firebaseUid });
    if (!dbUser) {
      dbUser = await User.findById(firebaseUid).catch(() => null);
    }
    if (!dbUser) {
      return res.status(404).json({ error: "User not found." });
    }

    // Get the latest resume for this user
    const resume = await Resume.findOne({ user: dbUser._id })
      .sort({ createdAt: -1 });

    if (!resume) {
      return res.status(200).json({ hasResume: false, resumeUrl: dbUser.resumeUrl || "" });
    }

    res.status(200).json({
      hasResume: true,
      resume,
      resumeUrl: dbUser.resumeUrl || "",
    });
  } catch (error) {
    console.error("Get Resume Error:", error);
    res.status(500).json({ error: "Failed to fetch resume data." });
  }
});

// ==============================
// HELPER: Generate Resume PDF with pdfkit
// ==============================
async function generateResumePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - 100; // 50px margin each side
      const accentColor = "#2563eb";
      const darkColor = "#1a1a2e";
      const grayColor = "#6b7280";

      // === HEADER ===
      doc
        .rect(0, 0, doc.page.width, 120)
        .fill(darkColor);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(28)
        .text(data.fullName || "Your Name", 50, 35, { width: pageWidth });

      // Contact info line
      const contactParts = [];
      if (data.email) contactParts.push(data.email);
      if (data.phone) contactParts.push(data.phone);
      if (data.address) contactParts.push(data.address);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#d1d5db")
        .text(contactParts.join("  |  "), 50, 75, { width: pageWidth });

      doc.moveDown(2);
      let yPos = 140;

      // === PROFESSIONAL SUMMARY ===
      if (data.summary) {
        yPos = drawSectionHeader(doc, "PROFESSIONAL SUMMARY", yPos, accentColor, pageWidth);
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#374151")
          .text(data.summary, 50, yPos, { width: pageWidth, lineGap: 3 });
        yPos = doc.y + 15;
      }

      // === EXPERIENCE ===
      if (data.experience && data.experience.length > 0) {
        yPos = checkPageBreak(doc, yPos, 80);
        yPos = drawSectionHeader(doc, "WORK EXPERIENCE", yPos, accentColor, pageWidth);
        for (const exp of data.experience) {
          yPos = checkPageBreak(doc, yPos, 60);
          doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .fillColor(darkColor)
            .text(exp.title || "Position", 50, yPos, { width: pageWidth * 0.6, continued: false });

          doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor(accentColor)
            .text(exp.duration || "", 50 + pageWidth * 0.6, yPos, {
              width: pageWidth * 0.4,
              align: "right",
            });

          yPos = doc.y > yPos + 14 ? doc.y : yPos + 14;

          doc
            .font("Helvetica-Oblique")
            .fontSize(10)
            .fillColor(grayColor)
            .text(exp.company || "", 50, yPos);
          yPos = doc.y + 4;

          if (exp.description) {
            doc
              .font("Helvetica")
              .fontSize(9)
              .fillColor("#4b5563")
              .text(exp.description, 60, yPos, { width: pageWidth - 10, lineGap: 2 });
            yPos = doc.y + 10;
          }
        }
        yPos += 5;
      }

      // === EDUCATION / QUALIFICATIONS ===
      if (data.qualifications && data.qualifications.length > 0) {
        yPos = checkPageBreak(doc, yPos, 60);
        yPos = drawSectionHeader(doc, "EDUCATION", yPos, accentColor, pageWidth);
        for (const qual of data.qualifications) {
          yPos = checkPageBreak(doc, yPos, 40);
          doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .fillColor(darkColor)
            .text(qual.degree || "Degree", 50, yPos, { width: pageWidth * 0.6 });

          doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor(accentColor)
            .text(qual.year || "", 50 + pageWidth * 0.6, yPos, {
              width: pageWidth * 0.4,
              align: "right",
            });

          yPos = doc.y > yPos + 14 ? doc.y : yPos + 14;

          doc
            .font("Helvetica-Oblique")
            .fontSize(10)
            .fillColor(grayColor)
            .text(`${qual.institution || ""}${qual.grade ? "  •  " + qual.grade : ""}`, 50, yPos);
          yPos = doc.y + 10;
        }
        yPos += 5;
      }

      // === SKILLS ===
      if (data.skills && data.skills.length > 0) {
        yPos = checkPageBreak(doc, yPos, 40);
        yPos = drawSectionHeader(doc, "SKILLS", yPos, accentColor, pageWidth);
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#374151")
          .text(data.skills.join("  •  "), 50, yPos, { width: pageWidth, lineGap: 3 });
        yPos = doc.y + 15;
      }

      // === PROJECTS ===
      if (data.projects && data.projects.length > 0) {
        yPos = checkPageBreak(doc, yPos, 60);
        yPos = drawSectionHeader(doc, "PROJECTS", yPos, accentColor, pageWidth);
        for (const proj of data.projects) {
          yPos = checkPageBreak(doc, yPos, 40);
          doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .fillColor(darkColor)
            .text(proj.name || "Project", 50, yPos);
          yPos = doc.y + 3;

          if (proj.description) {
            doc
              .font("Helvetica")
              .fontSize(9)
              .fillColor("#4b5563")
              .text(proj.description, 60, yPos, { width: pageWidth - 10, lineGap: 2 });
            yPos = doc.y + 3;
          }

          if (proj.link) {
            doc
              .font("Helvetica")
              .fontSize(8)
              .fillColor(accentColor)
              .text(proj.link, 60, yPos, { width: pageWidth - 10, link: proj.link });
            yPos = doc.y + 8;
          }
        }
        yPos += 5;
      }

      // === CERTIFICATIONS ===
      if (data.certifications && data.certifications.length > 0) {
        yPos = checkPageBreak(doc, yPos, 40);
        yPos = drawSectionHeader(doc, "CERTIFICATIONS", yPos, accentColor, pageWidth);
        for (const cert of data.certifications) {
          yPos = checkPageBreak(doc, yPos, 15);
          doc
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#374151")
            .text(`•  ${cert}`, 55, yPos, { width: pageWidth - 5 });
          yPos = doc.y + 5;
        }
      }

      // === FOOTER ===
      doc
        .fontSize(7)
        .fillColor("#9ca3af")
        .text(
          "Generated by InternArea Resume Builder",
          50,
          doc.page.height - 40,
          { width: pageWidth, align: "center" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function drawSectionHeader(doc, title, yPos, accentColor, pageWidth) {
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(accentColor)
    .text(title, 50, yPos);

  const lineY = doc.y + 3;
  doc
    .moveTo(50, lineY)
    .lineTo(50 + pageWidth, lineY)
    .strokeColor("#e5e7eb")
    .lineWidth(1)
    .stroke();

  return lineY + 10;
}

function checkPageBreak(doc, yPos, neededHeight) {
  if (yPos + neededHeight > doc.page.height - 60) {
    doc.addPage();
    return 50;
  }
  return yPos;
}

module.exports = router;
