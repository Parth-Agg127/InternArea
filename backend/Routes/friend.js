const express = require("express");
const router = express.Router();
const User = require("../Model/User");

// POST /api/friend/request — Send a friend request
router.post("/request", async (req, res) => {
  const { fromUid, toUid } = req.body;

  if (!fromUid || !toUid) {
    return res.status(400).json({ error: "fromUid and toUid are required" });
  }

  if (fromUid === toUid) {
    return res.status(400).json({ error: "Cannot send friend request to yourself" });
  }

  try {
    const fromUser = await User.findOne({ firebaseUid: fromUid });
    const toUser = await User.findOne({ firebaseUid: toUid });

    if (!fromUser || !toUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already friends
    if (fromUser.friends.includes(toUser._id)) {
      return res.status(400).json({ error: "Already friends" });
    }

    // Check if a pending request already exists
    const existingRequest = toUser.friendRequests.find(
      (req) =>
        req.from.toString() === fromUser._id.toString() &&
        req.status === "pending"
    );

    if (existingRequest) {
      return res.status(400).json({ error: "Friend request already sent" });
    }

    // Check if the other user already sent us a request — auto-accept
    const reverseRequest = fromUser.friendRequests.find(
      (req) =>
        req.from.toString() === toUser._id.toString() &&
        req.status === "pending"
    );

    if (reverseRequest) {
      // Auto-accept: both users already want to be friends
      reverseRequest.status = "accepted";
      fromUser.friends.push(toUser._id);
      toUser.friends.push(fromUser._id);
      await fromUser.save();
      await toUser.save();
      return res.status(200).json({ message: "Friend request auto-accepted! You are now friends.", autoAccepted: true });
    }

    // Add friend request to the target user
    toUser.friendRequests.push({
      from: fromUser._id,
      status: "pending",
    });

    await toUser.save();
    res.status(200).json({ message: "Friend request sent successfully" });
  } catch (error) {
    console.error("Friend request error:", error);
    res.status(500).json({ error: "Failed to send friend request" });
  }
});

// PUT /api/friend/accept/:requestId — Accept a friend request
router.put("/accept/:requestId", async (req, res) => {
  const { firebaseUid } = req.body;

  try {
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const request = user.friendRequests.id(req.params.requestId);
    if (!request) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Request already processed" });
    }

    // Accept the request
    request.status = "accepted";

    // Add each user to the other's friends array
    const fromUser = await User.findById(request.from);
    if (!fromUser) {
      return res.status(404).json({ error: "Requesting user not found" });
    }

    // Avoid duplicates
    if (!user.friends.includes(fromUser._id)) {
      user.friends.push(fromUser._id);
    }
    if (!fromUser.friends.includes(user._id)) {
      fromUser.friends.push(user._id);
    }

    await user.save();
    await fromUser.save();

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Accept friend error:", error);
    res.status(500).json({ error: "Failed to accept friend request" });
  }
});

// PUT /api/friend/reject/:requestId — Reject a friend request
router.put("/reject/:requestId", async (req, res) => {
  const { firebaseUid } = req.body;

  try {
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const request = user.friendRequests.id(req.params.requestId);
    if (!request) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    request.status = "rejected";
    await user.save();

    res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    console.error("Reject friend error:", error);
    res.status(500).json({ error: "Failed to reject friend request" });
  }
});

// GET /api/friend/:firebaseUid — Get user's friends list
router.get("/:firebaseUid", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid })
      .populate("friends", "name email photo firebaseUid");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user.friends);
  } catch (error) {
    console.error("Get friends error:", error);
    res.status(500).json({ error: "Failed to get friends" });
  }
});

// GET /api/friend/requests/:firebaseUid — Get pending friend requests
router.get("/requests/:firebaseUid", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid })
      .populate("friendRequests.from", "name email photo firebaseUid");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const pendingRequests = user.friendRequests.filter(
      (req) => req.status === "pending"
    );

    res.status(200).json(pendingRequests);
  } catch (error) {
    console.error("Get friend requests error:", error);
    res.status(500).json({ error: "Failed to get friend requests" });
  }
});

// DELETE /api/friend/remove — Remove a friend
router.delete("/remove", async (req, res) => {
  const { userUid, friendUid } = req.body;

  try {
    const user = await User.findOne({ firebaseUid: userUid });
    const friend = await User.findOne({ firebaseUid: friendUid });

    if (!user || !friend) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove each from the other's friends array
    user.friends = user.friends.filter(
      (id) => id.toString() !== friend._id.toString()
    );
    friend.friends = friend.friends.filter(
      (id) => id.toString() !== user._id.toString()
    );

    await user.save();
    await friend.save();

    res.status(200).json({ message: "Friend removed successfully" });
  } catch (error) {
    console.error("Remove friend error:", error);
    res.status(500).json({ error: "Failed to remove friend" });
  }
});

module.exports = router;
