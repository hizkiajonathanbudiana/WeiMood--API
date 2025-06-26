const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const ChatController = require("../controllers/chatController.js");
const MoodController = require("../controllers/moodController.js");
const ProfileController = require("../controllers/profileController.js");
const {
  protectorLogin,
  protectorProfile,
  protectorVerify,
} = require("../middlewares/middlewares");

const axios = require("axios");

router.get("/quotes", async (req, res, next) => {
  try {
    const { data } = await axios.get("http://api.quotable.io/quotes/random");
    const quote = Array.isArray(data) ? data[0] : data;
    res.json({
      content: quote.content,
      author: quote.author,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", userController.loginHandler);
router.post("/register", userController.registerHandler);
router.post("/google", userController.googleLogin);

console.log("masuk ke router verify");

router.use(protectorLogin);
router.get("/auth/me", (req, res) => {
  res.status(200).json({
    id: req.user.id,
    email: req.user.email,
  });
});

router.post("/logout", (req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
  });
  res.status(200).json({ message: "Logout successful" });
});

router.post("/verify", userController.verifyCodeHandler);

router.post("/verify/send", userController.sendVerificationEmail);

router.use(protectorVerify);

router.post("/profile", ProfileController.createProfile);

router.use(protectorProfile);

router.get("/moods", MoodController.getAllMoods);
router.post("/ai", ChatController.generateChat);
router.get("/chat", ChatController.getChatHistory);
router.get("/chat/:id", ChatController.getChatDetail);
router.post("/chat", ChatController.saveChat);
router.delete("/chat/:id", ChatController.deleteChat);
router.post("/moods", MoodController.createOrUpdateMood);
router.put("/profile", ProfileController.updateProfile);
router.delete("/profile", ProfileController.deleteProfile);
router.get("/profile", ProfileController.getProfile);

module.exports = router;
