const express = require("express");
const router = express.Router();
const adminuser = process.env.ADMIN_USERNAME;
const adminpass = process.env.ADMIN_PASSWORD;

router.post("/adminlogin", (req, res) => {
  const { username, password } = req.body;
  if (username === adminuser && password === adminpass) {
    res.send("admin is here");
  } else {
    res.status(401).send("unauthorized");
  }
});
module.exports = router;
