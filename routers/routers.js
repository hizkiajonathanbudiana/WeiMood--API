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
    secure: false,
    sameSite: "Strict",
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
