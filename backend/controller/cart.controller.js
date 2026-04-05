import User from "../models/User.js";
import AppError from "../utils/AppError.js";

/**
 * POST /api/cart/update
 * Atomically syncs the full cart state to the database.
 *
 * Fix applied: items with qty === 0 are explicitly $unset (removed) from the
 * DB document instead of being stored as 0, which previously caused stale
 * "ghost" entries to survive a page refresh.
 *
 * Body: { cartItems: { [productId]: quantity, ... } }
 *   - quantity > 0  → stored / updated
 *   - quantity === 0 → removed from document
 */
export const updateCart = async (req, res, next) => {
  const { cartItems } = req.body;
  try {
    if (typeof cartItems !== "object" || Array.isArray(cartItems)) {
      return next(new AppError("cartItems must be a plain object.", 400));
    }

    const setFields = {};
    const unsetFields = {};

    for (const [productId, qty] of Object.entries(cartItems)) {
      if (typeof qty !== "number" || qty < 0) {
        return next(
          new AppError(
            `Invalid quantity for product ${productId}. Must be a non-negative number.`,
            400
          )
        );
      }

      if (qty > 0) {
        setFields[`cartItems.${productId}`] = qty;
      } else {
        // qty === 0 means "remove this item" — $unset so the key is
        // fully deleted from the DB document, preventing ghost items on reload.
        unsetFields[`cartItems.${productId}`] = "";
      }
    }

    const update = {};
    if (Object.keys(setFields).length) update.$set = setFields;
    if (Object.keys(unsetFields).length) update.$unset = unsetFields;

    if (Object.keys(update).length) {
      await User.findByIdAndUpdate(req.user._id, update, { new: true });
    }

    return res.json({ success: true, message: "Cart updated successfully." });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/cart/clear
 * Wipes the entire cart for the authenticated user.
 * Called on successful order placement.
 */
export const clearCart = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      { $set: { cartItems: {} } },
      { new: true }
    );
    return res.json({ success: true, message: "Cart cleared." });
  } catch (error) {
    return next(error);
  }
};
