import express from "express";
import { login, logout, onboard, signup } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.post("/onboarding", protectRoute, onboard);

// check if user is logged in
router.get("/me", protectRoute, async (req, res) => {
  if (req.user?.profilePic && req.user.profilePic.includes("avatar.iran.liara.run")) {
    const match = req.user.profilePic.match(/\/(\d+)\.png/);
    const seed = match ? match[1] : req.user.fullName;
    req.user.profilePic = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    await req.user.save();
  }
  res.status(200).json({ success: true, user: req.user });
});

export default router;
