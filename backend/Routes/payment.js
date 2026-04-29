const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../Model/User");

// Initialize Razorpay Safely (Allows server to run even if keys are missing from .env)
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  console.warn("WARNING: Razorpay Keys are missing from .env. Payments will not work.");
}

// Helper for Plans
const planPrices = {
  Bronze: 100,
  Silver: 300,
  Gold: 1000,
};

// 1. Checkout Endpoint
router.post("/checkout", async (req, res) => {
  try {
    const { userId, plan } = req.body;

    if (!userId || !plan || !planPrices[plan]) {
      return res.status(400).json({ error: "Valid userId and plan are required." });
    }

    // Time Restriction Logic: 10:00 AM - 11:00 AM IST
    const now = new Date();
    const istHourStr = now.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
    });
    const istHour = parseInt(istHourStr, 10);

    // If it's 10:xx it's fine. Anything else is blocked.
    // Uncomment this for real production, maybe comment out for local testing if you want to test now:
    /*
    if (istHour !== 10) {
      return res.status(403).json({
        error: "Payments are only allowed between 10:00 AM and 11:00 AM IST. Please try again tomorrow.",
      });
    }
    */

    if (!razorpay) {
      return res.status(500).json({ error: "Razorpay is not configured on the backend." });
    }

    const amount = planPrices[plan] * 100; // Razorpay expects amount in paise
    const options = {
      amount,
      currency: "INR",
      receipt: `rcpt_${userId.slice(-8)}_${Date.now()}`.slice(0, 40),
      notes: {
        userId,
        plan,
      },
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// 2. Webhook & Email Endpoint
router.post("/webhook", async (req, res) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  
  // Verify Signature
  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (digest === req.headers["x-razorpay-signature"]) {
    // Correct Signature
    const event = req.body.event;
    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = req.body.payload.payment.entity;
      const { plan, userId } = paymentEntity.notes;

      try {
        // Upgrade user plan
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1); // 1 month validity

        const updatedUser = await User.findByIdAndUpdate(userId, {
          currentPlan: plan,
          applicationsUsedThisMonth: 0,
          planExpiryDate: expiryDate,
        }, { new: true });

        // Send Invoice Email
        if (updatedUser && updatedUser.email) {
          sendInvoiceEmail(updatedUser, paymentEntity);
        }

      } catch (err) {
        console.error("Error updating user from webhook:", err);
      }
    }
    res.status(200).json({ status: "ok" });
  } else {
    // Invalid Signature
    res.status(400).json({ error: "Invalid Signature" });
  }
});

// Helper Function: Send Invoice Email
async function sendInvoiceEmail(user, paymentDetails) {
  try {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const amountInINR = paymentDetails.amount / 100;

    const mailOptions = {
      from: `"InternArea Subscriptions" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Subscription Invoice & Payment Success",
      html: `
        <h2>Payment Successful</h2>
        <p>Hi ${user.name},</p>
        <p>Your subscription for the <strong>${user.currentPlan}</strong> plan was successful!</p>
        <h3>Invoice Details:</h3>
        <ul>
          <li><strong>Amount Paid:</strong> ₹${amountInINR}</li>
          <li><strong>Payment ID:</strong> ${paymentDetails.id}</li>
          <li><strong>Valid Until:</strong> ${user.planExpiryDate.toDateString()}</li>
        </ul>
        <p>Enjoy your new limits!</p>
        <br/>
        <p>Best Regards,</p>
        <p>The InternArea Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Invoice email sent successfully to", user.email);
  } catch (err) {
    console.error("Error sending invoice email:", err);
  }
}

module.exports = router;
