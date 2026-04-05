import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

import connectDB from "./config/connectDB.js";
import connectCloudinary from "./config/cloudinary.js";

import userRoutes from "./routes/user.routes.js";
import sellerRoutes from "./routes/seller.routes.js";
import productRoutes from "./routes/product.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import addressRoutes from "./routes/address.routes.js";
import orderRoutes from "./routes/order.routes.js";
import orderActionsRoutes from "./routes/orderActions.routes.js";
import recommendationRoutes from "./routes/recommendation.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";

import errorHandler from "./middlewares/errorHandler.js";

// ─── Boot-time env validation ────────────────────────────────────────────────
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET", "GEMINI_API_KEY"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 16) {
  console.error("❌ JWT_SECRET must be at least 16 characters long.");
  process.exit(1);
}

// ─── App setup ───────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// const __dirname = path.resolve(); //for deplyment

connectDB();
connectCloudinary();

// ─── Security middleware ──────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(mongoSanitize());

// ─── General middleware ───────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(",")
      : [/http:\/\/localhost:\d+/],
    credentials: true,
  })
);

// ─── Rate limiting ────────────────────────────────────────────────────────────
// General API limit: 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

// Strict auth limit: 5 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." },
  skipSuccessfulRequests: true,
});

app.use("/api", generalLimiter);
app.use("/api/user/login", authLimiter);
app.use("/api/user/register", authLimiter);
app.use("/api/seller/login", authLimiter);

// ─── Static uploads ───────────────────────────────────────────────────────────
app.use("/images", express.static(path.join(__dirname, "uploads")));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/user", userRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/product", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/orders", orderActionsRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/wishlist", wishlistRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ success: true, message: "FreshBasket API is running 🛒" });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ─── Centralized error handler ────────────────────────────────────────────────
app.use(errorHandler);

// //for deployment

// if (process.env.NODE_ENV === "production") {
//   app.use(express.static(path.join(__dirname, "../frontend/dist")));

//   app.get("*", (req, res) => {
//     res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
//   });
// }

app.listen(PORT, () => {
  console.log(`🛒 FreshBasket API running on http://localhost:${PORT}`);
});
