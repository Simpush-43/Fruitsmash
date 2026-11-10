const express = require("express");
const jwt = require("jsonwebtoken");
const {
  createMessage,
  uploadAttachment,
  listMessages,
  listConversations,
  postHeartbeat,
  markOffline,
  getPresence,
} = require("../Contollers/ChatController");

const route = express.Router();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" });
  }
  jwt.verify(authHeader.slice(7), process.env.ACCESS_SECRET, (error, user) => {
    if (error) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    return next();
  });
};

const requirePrivateChat = (req, res, next) => {
  if (req.session?.privateChatUnlocked) return next();

  const privateChatToken = req.get("X-Private-Chat-Token");
  if (privateChatToken) {
    try {
      const grant = jwt.verify(privateChatToken, process.env.CLIENT_SECRET);
      if (grant.scope === "private-chat") return next();
    } catch (error) {
      if (error.name !== "TokenExpiredError" && error.name !== "JsonWebTokenError") {
        console.error("Could not validate private chat access:", error);
      }
    }
  }

  return res.status(403).json({ message: "Enter the referral code to access private chat." });
};

route.use(verifyToken, requirePrivateChat);
route.get("/messages/conversations", listConversations);
route.get("/messages/:contactId", listMessages);
route.post("/messages", createMessage);
route.post("/messages/upload", uploadAttachment);
route.post("/presence/heartbeat", postHeartbeat);
route.post("/presence/offline", markOffline);
route.get("/presence", getPresence);

module.exports = route;
