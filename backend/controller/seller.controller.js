import jwt from "jsonwebtoken";
import Order from "../models/Order.js";
import {
  clearUserTokenCookie,
  clearSellerTokenCookie,
  sellerTokenCookieOptions,
} from "../utils/authCookies.js";

// POST /api/seller/login
export const loginSeller = async (req, res) => {
  const { email, password } = req.body;
  const SELLER_EMAIL = process.env.SELLER_EMAIL;
  const SELLER_PASSWORD = process.env.SELLER_PASSWORD;

  try {
    if (
      email !== SELLER_EMAIL ||
      password !== SELLER_PASSWORD
    ) {
      return res.status(401).json({ success: false, message: "Invalid seller credentials." });
    }
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "7d" });

    clearUserTokenCookie(res);
    res.cookie("sellerToken", token, {
      ...sellerTokenCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, message: "Seller logged in." });
  } catch (error) {
    console.error("loginSeller error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/seller/is-auth
export const isAuthSeller = async (req, res) => {
  return res.json({ success: true, message: "Seller is authenticated." });
};

// GET /api/seller/logout
export const logoutSeller = async (req, res) => {
  clearSellerTokenCookie(res);
  return res.json({ success: true, message: "Seller logged out." });
};

// GET /api/seller/reviews — all order reviews (store-wide seller)
export const getSellerReviews = async (req, res) => {
  try {
    const orders = await Order.find({
      "review.rating": { $exists: true, $ne: null },
    })
      .populate("userId", "name email")
      .populate("items.product")
      .sort({ "review.createdAt": -1 });

    const reviews = orders.map((o) => ({
      orderId: o._id,
      rating: o.review.rating,
      comment: o.review.comment,
      createdAt: o.review.createdAt,
      user: o.userId
        ? { _id: o.userId._id, name: o.userId.name, email: o.userId.email }
        : null,
      products: o.items
        .filter((i) => i.product)
        .map((i) => ({
          _id: i.product._id,
          name: i.product.name,
          offerPrice: i.product.offerPrice,
          image: i.product.image,
        })),
    }));

    const ratings = reviews.map((r) => r.rating);
    const averageRating =
      ratings.length === 0
        ? null
        : Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;

    return res.json({
      success: true,
      reviews,
      averageRating,
      count: reviews.length,
    });
  } catch (error) {
    console.error("getSellerReviews error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
