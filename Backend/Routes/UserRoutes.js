const express = require("express");
const jwt = require("jsonwebtoken");
const route = express.Router();

const {
  Signin,
  Signup,
  handleGoogleCallback,
  fetchAlluser,
  verifyReferralCode,
  getPrivateChatStatus,
} = require("../Contollers/UserSignUpContoller");
const User = require("../Models/UserDetailSchema");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_SECRET, (err, user) => {
      if (err) {
        console.log("JWT failed", err);
        return res.status(403).json({ message: "Invalid token" });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ message: "Missing token" });
  }
};

route.post("/auth/google/callback", handleGoogleCallback);
route.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { Password, ...safeuser } = user.toObject();
    res.status(200).json(safeuser);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

route.get("/users", verifyToken, fetchAlluser);
route.post("/signin", Signin);
route.post("/signup", Signup);
route.post("/verify-referral-code", verifyReferralCode);
route.get("/private-chat-status", getPrivateChatStatus);

module.exports = route;
