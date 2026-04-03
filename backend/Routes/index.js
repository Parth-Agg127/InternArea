const express = require("express");
const router = express.Router();
const admin = require("./admin");
const intern = require("./internship");
const job = require("./job");
const application = require("./application");
const user = require("./user");
const friend = require("./friend");
const post = require("./post");
const auth = require("./auth");
const passwordReset = require("./passwordReset");
const payment = require("./payment");

router.use("/admin", admin);
router.use("/internship", intern);
router.use("/job", job);
router.use("/application", application);
router.use("/user", user);
router.use("/friend", friend);
router.use("/post", post);
router.use("/auth", auth);
router.use("/password-reset", passwordReset);
router.use("/payment", payment);

module.exports = router;

