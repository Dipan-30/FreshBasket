import express from "express";
import {
  getWishlist,
  toggleWishlist,
  clearWishlist,
} from "../controller/wishlist.controller.js";
import authUser from "../middlewares/authUser.js";

const router = express.Router();

// All wishlist routes require authentication
router.get("/", authUser, getWishlist);
router.post("/toggle", authUser, toggleWishlist);
router.delete("/clear", authUser, clearWishlist);

export default router;
