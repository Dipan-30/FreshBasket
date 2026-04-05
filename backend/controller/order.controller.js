import mongoose from "mongoose";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import AppError from "../utils/AppError.js";

// POST /api/order/cod
export const placeOrderCOD = async (req, res, next) => {
  const { items, amount, address } = req.body;

  if (!items || items.length === 0 || !amount || !address) {
    return next(new AppError("Missing required order fields (items, amount, address).", 400));
  }

  const adjustments = [];
  let orderCreated = false;

  try {
    for (const item of items) {
      const qty = Number(item.quantity);
      const pid = item.product;
      if (!pid || !Number.isFinite(qty) || qty < 1 || !Number.isInteger(qty)) {
        throw new AppError("Each order item needs a valid product and quantity.", 400);
      }

      const updated = await Product.findOneAndUpdate(
        { _id: pid, quantity: { $gte: qty } },
        [
          { $set: { quantity: { $subtract: ["$quantity", qty] } } },
          { $set: { inStock: { $gt: ["$quantity", 0] } } },
        ],
        { new: true }
      );

      if (!updated) {
        throw new AppError(
          "Insufficient stock for one or more items. Please refresh your cart and try again.",
          400
        );
      }
      adjustments.push({ pid, qty });
    }

    const order = await Order.create({
      userId: req.user._id,
      items,
      amount,
      address,
      status: "placed",
      paymentType: "COD",
      isPaid: false,
    });
    orderCreated = true;

    await User.findByIdAndUpdate(req.user._id, { cartItems: {} });

    const populated = await Order.findById(order._id)
      .populate("items.product")
      .populate("address");

    return res.status(201).json({ success: true, order: populated });
  } catch (error) {
    if (!orderCreated && adjustments.length > 0) {
      for (const { pid, qty } of [...adjustments].reverse()) {
        await Product.findByIdAndUpdate(pid, { $inc: { quantity: qty } });
        const p = await Product.findById(pid).lean();
        if (p) {
          await Product.findByIdAndUpdate(pid, { inStock: p.quantity > 0 });
        }
      }
    }
    return next(error);
  }
};

// GET /api/order/user
export const getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate("items.product")
      .populate("address")
      .sort({ createdAt: -1 });
    return res.json({ success: true, orders });
  } catch (error) {
    return next(error);
  }
};

// GET /api/order/seller  (seller protected)
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({})
      .populate("userId", "name email")
      .populate("items.product")
      .populate("address")
      .sort({ createdAt: -1 });
    return res.json({ success: true, orders });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/orders/:id/deliver  (seller protected)
export const markOrderDelivered = async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return next(new AppError("Invalid order id.", 400));
  }
  try {
    const order = await Order.findById(id);
    if (!order) {
      return next(new AppError("Order not found.", 404));
    }
    if (order.status === "delivered") {
      return next(new AppError("Order is already delivered.", 400));
    }
    order.status = "delivered";
    order.deliveredAt = new Date();
    await order.save();

    const populated = await Order.findById(order._id)
      .populate("items.product")
      .populate("address")
      .populate("userId", "name email");

    return res.json({ success: true, order: populated });
  } catch (error) {
    return next(error);
  }
};

// POST /api/orders/:id/review  (user protected)
export const addOrderReview = async (req, res, next) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    return next(new AppError("Invalid order id.", 400));
  }

  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return next(new AppError("Rating must be a whole number from 1 to 5.", 400));
  }

  try {
    const order = await Order.findOne({ _id: id, userId: req.user._id });
    if (!order) {
      return next(new AppError("Order not found.", 404));
    }
    if (order.status !== "delivered") {
      return next(new AppError("You can only review orders that have been delivered.", 400));
    }
    if (order.review != null && order.review.rating != null) {
      return next(new AppError("You have already submitted a review for this order.", 400));
    }

    order.review = {
      rating: r,
      comment: typeof comment === "string" ? comment.trim() : "",
      createdAt: new Date(),
    };
    await order.save();

    const populated = await Order.findById(order._id)
      .populate("items.product")
      .populate("address");

    return res.status(201).json({ success: true, order: populated });
  } catch (error) {
    return next(error);
  }
};
