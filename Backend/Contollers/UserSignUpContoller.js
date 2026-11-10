const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20");
const User = require("../Models/UserDetailSchema");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");
const envPath = path.resolve(__dirname, "../.env");

dotenv.config({ path: envPath });

const DEFAULT_REFERRAL_CODE = "FRUITSAFE";

function generateToken(user) {
  if (!process.env.ACCESS_SECRET || !process.env.REFRESH_SECRET) {
    throw new Error("Set ACCESS_SECRET and REFRESH_SECRET in Backend/.env before using signup or login.");
  }

  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.ACCESS_SECRET,
    { expiresIn: "10d" }
  );
  const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_SECRET, {
    expiresIn: "10m",
  });
  return { accessToken, refreshToken };
}

exports.Signup = async (req, res) => {
  try {
    const { Firstname, Lastname, Password, Age } = req.body;
    const Email = String(req.body?.Email || "").trim().toLowerCase();
    if (!Email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const Existinguser = await User.findOne({ Email });
    if (Existinguser) {
      return res.status(400).json({ message: "User Already Exist,Please login" });
    }

    const Newuser = new User({
      Firstname,
      Lastname,
      Email,
      Password,
      Age: Number(Age),
    });
    await Newuser.save();
    const tokens = generateToken(Newuser);
    res.status(201).json({
      message: "User signed up succefully",
      user: { id: Newuser._id, Firstname, Lastname, Email, Age },
      tokens,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const indexedEmail = error.keyValue?.email;
      if (error.keyPattern?.email && (indexedEmail === null || indexedEmail === undefined)) {
        return res.status(500).json({
          message:
            "The database has a stale unique index named email_1. In MongoDB Atlas, remove email_1 from test.users and keep the current Email_1 index.",
        });
      }
      return res.status(409).json({ message: "An account with this email already exists. Please log in." });
    }
    console.error("Signup controller error:", error);
    res.status(500).json({ message: "error in logging in", error: error.message });
  }
};

exports.Signin = async (req, res) => {
  try {
    const { Password } = req.body;
    const Email = String(req.body?.Email || "").trim().toLowerCase();
    if (!Email || !Password) {
      return res.status(400).json({ message: "Email and password are required." });
    }
    const user = await User.findOne({ Email });
    if (!user) {
      return res.status(400).json({ message: "Invalid Credentials!" });
    }

    const isMatch = await bcrypt.compare(Password, user.Password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials!" });
    }

    const tokens = generateToken(user);

    res.status(200).json({
      message: "user logged in succesfully",
      user: { id: user._id, Email: user.Email },
      tokens,
    });
  } catch (error) {
    res.status(500).json({ message: "Error in logging in", error: error.message });
  }
};

exports.fetchAlluser = async (req, res) => {
  try {
    const users = await User.find({}, "-Password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
    console.log(error.message);
  }
};

exports.verifyReferralCode = async (req, res) => {
  const codeFromRequest = String(req.body?.code || "").trim();
  const validCode = String(process.env.REFERRAL_CODE || DEFAULT_REFERRAL_CODE).trim();

  if (!codeFromRequest || codeFromRequest !== validCode) {
    return res.status(200).json({ success: false, message: "Better luck next time!" });
  }

  req.session.privateChatUnlocked = true;
  req.session.save((error) => {
    if (error) {
      console.error("Could not save private session", error);
      return res.status(500).json({ success: false, message: "Better luck next time!" });
    }
    return res.status(200).json({ success: true, message: "Access granted" });
  });
};

exports.getPrivateChatStatus = async (req, res) => {
  return res.status(200).json({ unlocked: Boolean(req.session?.privateChatUnlocked) });
};

exports.handleGoogleCallback = async (req, res) => {
  try {
    const { access_token } = req.body || {};
    if (!access_token) {
      console.error("No access token received in request body.");
      return res.status(400).json({ message: "Access token is missing." });
    }
    const googleUserInfo = await axios.get(`${process.env.userInfoGoogle}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const { email, given_name, family_name, picture } = googleUserInfo.data;

    let user = await User.findOne({ Email: email });
    if (!user) {
      user = await User.create({
        Email: email,
        Firstname: given_name,
        Lastname: family_name || "",
        Password: "-google-auth-" + Math.random().toString(36).slice(-8),
        Age: 13,
        Profilepic: picture,
      });
    }
    if (!user.Profilepic) {
      user.Profilepic = picture;
      await user.save();
    }
    const { accessToken, refreshToken } = generateToken(user);
    res.status(200).json({
      message: "Successfully authenticated with Google",
      user: {
        id: user._id,
        email: user.Email,
        firstname: user.Firstname,
        lastname: user.Lastname,
        Profilepic: user.Profilepic,
      },
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    console.error("Google authentication error:", error);
    res.status(500).json({
      message: "Failed to authenticate with Google",
      error: error.message,
    });
  }
};
