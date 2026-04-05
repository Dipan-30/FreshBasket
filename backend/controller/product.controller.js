import Product from "../models/Product.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import AppError from "../utils/AppError.js";

// POST /api/product/add-product  (seller protected)
export const addProduct = async (req, res, next) => {
  try {
    const { name, description, price, offerPrice, category, quantity } = req.body;
    const files = req.files;

    const qtyNum = Number(quantity);
    if (!name || !description || !price || !offerPrice || !category || quantity === undefined || quantity === "") {
      return next(
        new AppError("All fields (name, description, price, offerPrice, category, quantity) are required.", 400)
      );
    }
    if (!Number.isFinite(qtyNum) || qtyNum < 0 || !Number.isInteger(qtyNum)) {
      return next(new AppError("Quantity must be a non-negative whole number.", 400));
    }
    if (!files || files.length === 0) {
      return next(new AppError("At least one image is required.", 400));
    }
    if (Number(offerPrice) > Number(price)) {
      return next(new AppError("Offer price cannot exceed the original price.", 400));
    }

    let imageUrls = [];

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (cloudName && cloudName !== "your_cloud_name") {
      for (const file of files) {
        const result = await cloudinary.uploader.upload(file.path, { folder: "grocery-gemini" });
        imageUrls.push(result.secure_url);
        fs.unlinkSync(file.path);
      }
    } else {
      imageUrls = files.map((f) => `/images/${f.filename}`);
    }

    const product = await Product.create({
      name,
      description,
      price: Number(price),
      offerPrice: Number(offerPrice),
      image: imageUrls,
      category,
      quantity: qtyNum,
      inStock: qtyNum > 0,
    });

    return res.status(201).json({ success: true, product });
  } catch (error) {
    return next(error);
  }
};

// GET /api/product/list
export const listProducts = async (req, res, next) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    return res.json({ success: true, products });
  } catch (error) {
    return next(error);
  }
};

// GET /api/product/search?q=&category=&page=&limit=
export const searchProducts = async (req, res, next) => {
  try {
    const { q, category, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {};
    if (category && category !== "All") filter.category = category;

    let products;
    let total;

    if (q && q.trim()) {
      // Text search with relevance scoring
      filter.$text = { $search: q.trim() };
      products = await Product.find(filter, { score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(Number(limit));
      total = await Product.countDocuments(filter);
    } else {
      products = await Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));
      total = await Product.countDocuments(filter);
    }

    return res.json({
      success: true,
      products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/product/id?id=xxx
export const getProductById = async (req, res, next) => {
  const { id } = req.query;
  try {
    const product = await Product.findById(id);
    if (!product) {
      return next(new AppError("Product not found.", 404));
    }
    return res.json({ success: true, product });
  } catch (error) {
    return next(error);
  }
};

// POST /api/product/stock  (seller protected)
export const updateStock = async (req, res, next) => {
  const { id, inStock } = req.body;
  try {
    const product = await Product.findByIdAndUpdate(id, { inStock }, { new: true });
    if (!product) {
      return next(new AppError("Product not found.", 404));
    }
    return res.json({ success: true, product });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/product/quantity  (seller protected) — add or subtract on-hand quantity
export const adjustProductQuantity = async (req, res, next) => {
  const { id, add, subtract } = req.body;
  try {
    const hasAdd = add !== undefined && add !== "";
    const hasSub = subtract !== undefined && subtract !== "";

    if (!id || (hasAdd && hasSub) || (!hasAdd && !hasSub)) {
      return next(
        new AppError("Product id and exactly one of `add` or `subtract` (positive whole numbers) are required.", 400)
      );
    }

    const n = Number(hasAdd ? add : subtract);
    if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
      return next(new AppError("`add` and `subtract` must be positive whole numbers.", 400));
    }

    const product = await Product.findById(id);
    if (!product) {
      return next(new AppError("Product not found.", 404));
    }

    const current = typeof product.quantity === "number" ? product.quantity : 0;
    const nextQty = hasAdd ? current + n : Math.max(0, current - n);

    const updated = await Product.findByIdAndUpdate(
      id,
      { quantity: nextQty, inStock: nextQty > 0 },
      { new: true, runValidators: true }
    );

    return res.json({ success: true, product: updated });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/product/:id (seller protected)
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return next(new AppError("Product not found.", 404));
    }
    return res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    return next(error);
  }
};
