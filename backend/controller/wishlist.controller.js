import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";
import AppError from "../utils/AppError.js";

/**
 * GET /api/wishlist
 * Returns the authenticated user's wishlist with populated product details.
 */
export const getWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.user._id }).populate(
      "products",
      "_id name price offerPrice image category inStock quantity description"
    );

    const products = wishlist ? wishlist.products.filter(Boolean) : [];

    return res.json({ success: true, products });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/wishlist/toggle
 * Body: { productId }
 * Adds the product if not present, removes it if already present.
 * Returns the updated list of product IDs.
 */
export const toggleWishlist = async (req, res, next) => {
  const { productId } = req.body;
  try {
    if (!productId) {
      return next(new AppError("productId is required.", 400));
    }

    // Verify product exists
    const product = await Product.findById(productId).select("_id");
    if (!product) {
      return next(new AppError("Product not found.", 404));
    }

    let wishlist = await Wishlist.findOne({ userId: req.user._id });

    if (!wishlist) {
      // First wishlist item for this user — create the document
      wishlist = await Wishlist.create({
        userId: req.user._id,
        products: [productId],
      });
      return res.json({
        success: true,
        action: "added",
        wishlistIds: wishlist.products.map(String),
      });
    }

    const alreadyIdx = wishlist.products.findIndex(
      (id) => String(id) === String(productId)
    );

    if (alreadyIdx >= 0) {
      // Remove
      wishlist.products.splice(alreadyIdx, 1);
      await wishlist.save();
      return res.json({
        success: true,
        action: "removed",
        wishlistIds: wishlist.products.map(String),
      });
    } else {
      // Add
      wishlist.products.push(productId);
      await wishlist.save();
      return res.json({
        success: true,
        action: "added",
        wishlistIds: wishlist.products.map(String),
      });
    }
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/wishlist/clear
 * Removes all items from the authenticated user's wishlist.
 */
export const clearWishlist = async (req, res, next) => {
  try {
    await Wishlist.findOneAndUpdate(
      { userId: req.user._id },
      { products: [] },
      { upsert: true }
    );
    return res.json({ success: true, message: "Wishlist cleared.", wishlistIds: [] });
  } catch (error) {
    return next(error);
  }
};
