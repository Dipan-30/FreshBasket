import mongoose from "mongoose";

/**
 * Wishlist — one document per user.
 * Each document holds a set of product ObjectIds belonging to that user.
 * Using a dedicated collection (instead of embedding in User) makes
 * queries simpler and avoids ballooning the User document.
 */
const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one wishlist per user
      index: true,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  { timestamps: true }
);

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
export default Wishlist;
