require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connect } = require("./db");
const router = require("./Routes/index");
const port = process.env.PORT || 5000;

const app = express()

app.use(cors())
// Using built-in express parsers instead of body-parser
app.use(express.json({limit: "50mb"}))
app.use(express.urlencoded({extended: true, limit: "50mb"}))

app.get('/', (req, res) => {
    res.send("hello this is internshala backend")
})

app.use("/api", router);
connect();

app.use((req, res, next) => {
    req.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Origin", "*")
    next()
})

app.listen(port, () => {
    console.log(`Server is running on the port ${port}`)
})

// === CRON JOB ===
// Run every day at midnight (00:00) server time
const cron = require("node-cron");
const User = require("./Model/User");

cron.schedule("0 0 * * *", async () => {
  console.log("Running Daily Cron Job: Checking Subscription Renewals");
  try {
    const today = new Date();
    // Reset applications for everyone who has past their planExpiryDate, or simply run a monthly reset logic.
    // For simplicity: if plan has expired, reset them to free.
    const expiredUsers = await User.updateMany(
      { planExpiryDate: { $lte: today }, currentPlan: { $ne: "Free" } },
      { $set: { currentPlan: "Free", applicationsUsedThisMonth: 0, planExpiryDate: null } }
    );
    console.log(`Downgraded ${expiredUsers.modifiedCount} expired subscriptions to Free Plan.`);
  } catch (error) {
    console.error("Cron Job Error:", error);
  }
});

