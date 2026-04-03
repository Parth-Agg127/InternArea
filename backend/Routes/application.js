const express = require("express");
const router = express.Router();
const application = require("../Model/Application");

const User = require("../Model/User");

// Helper for Plan Limits
const planLimits = {
  Free: 1,
  Bronze: 3,
  Silver: 5,
  Gold: Infinity,
};

router.post("/", async (req, res) => {
  try {
    // 1. Subscription Check Logic
    const requestedUserId = req.body.user._id || req.body.user.uid || req.body.user.id;
    if (!requestedUserId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Attempt to find user by their mongo ID or firebaseUid
    let dbUser = await User.findById(requestedUserId).catch(() => null);
    if (!dbUser) {
      dbUser = await User.findOne({ firebaseUid: requestedUserId });
    }

    if (dbUser) {
      const userPlan = dbUser.currentPlan || "Free";
      const maxLimit = planLimits[userPlan] || 1;
      
      if (dbUser.applicationsUsedThisMonth >= maxLimit && maxLimit !== Infinity) {
        return res.status(403).json({ 
          error: `You have reached your monthly application limit for the ${userPlan} plan. Please upgrade your subscription to apply for more.`
        });
      }

      // Increment their usage
      dbUser.applicationsUsedThisMonth += 1;
      await dbUser.save();
    }

    // 2. Original Application Code
    const applicationipdata = new application({
      company: req.body.company,
      category: req.body.category,
      coverLetter: req.body.coverLetter,
      user: req.body.user,
      Application: req.body.Application,
      body: req.body.body,
    });
    
    const data = await applicationipdata.save();
    res.send(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/", async (req, res) => {
  try {
    const data = await application.find();
    res.json(data).status(200);
  } catch (error) {
    console.log(error);
    res.status(404).json({ error: "internal server error" });
  }
});
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const data = await application.findById(id);
    if (!data) {
      res.status(404).json({ error: "application not found" });
    }
    res.json(data).status(200);
  } catch (error) {
    console.log(error);
    res.status(404).json({ error: "internal server error" });
  }
});
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  let status;
  if (action === "accepted") {
    status = "accepted";
  } else if (action === "rejected") {
    status = "rejected";
  } else {
    res.status(404).json({ error: "Invalid action" });
    return;
  }
  try {
    const updateapplication = await application.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );
    if (!updateapplication) {
      res.status(404).json({ error: "Not able to update the application" });
      return;
    }
    res.status(200).json({ sucess: true, data: updateapplication });
  } catch (error) {
    res.status(500).json({ error: "internal server error" });
  }
});
module.exports = router;
