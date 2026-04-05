import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import {
  clearSellerTokenCookie,
  clearUserTokenCookie,
  userTokenCookieOptions,
} from "../utils/authCookies.js";

// Helper to create JWT cookie
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// POST /api/user/register
export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: "User already exists with this email." });
    }
    const hashed = await bcryptjs.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    const token = createToken(user._id);

    clearSellerTokenCookie(res);
    res.cookie("token", token, {
      ...userTokenCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(201).json({
      success: true,
      user: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("registerUser error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/user/login
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Use 401 (not 404) — never reveal whether the email exists
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    const token = createToken(user._id);

    clearSellerTokenCookie(res);
    res.cookie("token", token, {
      ...userTokenCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      user: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("loginUser error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/user/is-auth
export const isAuthUser = async (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
};

// GET /api/user/check-email?email=  (registration UX — debounced on client)
export const checkEmailAvailability = async (req, res) => {
  try {
    const email = String(req.query.email || "").toLowerCase().trim();
    const existing = await User.findOne({ email });
    return res.json({ success: true, available: !existing });
  } catch (error) {
    console.error("checkEmailAvailability error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/user/logout
export const logoutUser = async (req, res) => {
  clearUserTokenCookie(res);
  return res.json({ success: true, message: "Logged out successfully." });
};
