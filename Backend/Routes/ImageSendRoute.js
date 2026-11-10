const express = require("express");
const jwt = require("jsonwebtoken");
const route = express.Router();
const {
  ImageUpload,
  getAllimages,
  ReceiveImages,
} = require("../Contollers/ImageUploadController");
// verify token
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
route.post("/upload", verifyToken, ImageUpload);
route.get("/images", verifyToken, getAllimages);
route.get("/images/receive", verifyToken, ReceiveImages);
module.exports = route;
