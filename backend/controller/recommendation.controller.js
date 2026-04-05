import User from "../models/User.js";
import Product from "../models/Product.js";
import {
  buildCartHash,
  getCachedRecommendations,
  setCachedRecommendations,
} from "../services/recommendationPipeline.js";
import AppError from "../utils/AppError.js";

/**
 * URL of the Python AI microservice.
 * Falls back to the original JS pipeline if the env var is not set,
 * preserving 100% backward-compatibility during migration.
 */
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || null;

// In-memory feedback log (kept simple — no DB dependency)
const feedbackLog = new Map(); // key: `${userId}:${productId}` → { action, ts }

// ── Helper: call Python AI microservice ──────────────────────────────────────
async function callPythonService(cartProducts, availableProducts, cartProductIds) {
  const url = `${AI_SERVICE_URL}/recommend`;

  // Map Mongoose documents to plain objects the Python service understands
  const toSlim = (p) => ({
    id: String(p._id),
    name: p.name,
    category: p.category,
    description: p.description || "",
    price: p.price,
    offerPrice: p.offerPrice,
    inStock: p.inStock,
    image: p.image || [],
  });

  const body = {
    cartProducts: cartProducts.map(toSlim),
    availableProducts: availableProducts.map(toSlim),
    cartProductIds,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000), // 30-second timeout
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI service responded ${response.status}: ${text}`);
  }

  return response.json();
}

// ── GET /api/recommendations/cart ─────────────────────────────────────────────
export const getCartRecommendations = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const cartItems = user.cartItems || {};
    const cartProductIds = Object.keys(cartItems).filter((id) => cartItems[id] > 0);

    if (cartProductIds.length === 0) {
      return res.json({
        success: true,
        recommendations: [],
        message: "Add some items to your cart to get recommendations.",
      });
    }

    // ── Check cache first ────────────────────────────────────────────────────
    const cartHash = buildCartHash(cartItems);
    const cached = getCachedRecommendations(String(req.user._id), cartHash);
    if (cached) {
      return res.json({
        success: true,
        recommendations: cached.recommendations,
        usedFallback: cached.usedFallback,
        fromCache: true,
      });
    }

    // ── Fetch DB data ─────────────────────────────────────────────────────────
    const cartProducts = await Product.find({ _id: { $in: cartProductIds } });
    const availableProducts = await Product.find({
      _id: { $nin: cartProductIds },
      inStock: true,
    });

    if (availableProducts.length === 0) {
      return res.json({ success: true, recommendations: [] });
    }

    // ── Run pipeline (Python or JS) ───────────────────────────────────────────
    let recommendations, usedFallback;

    if (AI_SERVICE_URL) {
      // ── Python microservice path ─────────────────────────────────────────
      try {
        const result = await callPythonService(cartProducts, availableProducts, cartProductIds);
        recommendations = result.recommendations || [];
        usedFallback = result.usedFallback || false;
      } catch (err) {
        console.error("Python AI service call failed, falling back to JS pipeline:", err.message);
        // Graceful fallback to JS pipeline
        const { runRecommendationPipeline } = await import("../services/recommendationPipeline.js");
        ({ recommendations, usedFallback } = await runRecommendationPipeline({
          cartProducts, availableProducts, cartProductIds,
        }));
      }
    } else {
      // ── Original JS pipeline path (unchanged) ────────────────────────────
      const { runRecommendationPipeline } = await import("../services/recommendationPipeline.js");
      ({ recommendations, usedFallback } = await runRecommendationPipeline({
        cartProducts, availableProducts, cartProductIds,
      }));
    }

    // ── Cache result ──────────────────────────────────────────────────────────
    setCachedRecommendations(String(req.user._id), cartHash, {
      recommendations,
      usedFallback,
    });

    return res.json({ success: true, recommendations, usedFallback });
  } catch (error) {
    return next(error);
  }
};

// ── GET /api/recommendations/history ─────────────────────────────────────────
export const getRecommendationHistory = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const cartItems = user.cartItems || {};

    if (Object.keys(cartItems).length === 0) {
      return res.json({ success: true, recommendations: [], fromCache: false });
    }

    const cartHash = buildCartHash(cartItems);
    const cached = getCachedRecommendations(String(req.user._id), cartHash);

    if (cached) {
      return res.json({
        success: true,
        recommendations: cached.recommendations,
        usedFallback: cached.usedFallback,
        fromCache: true,
      });
    }

    return res.json({ success: true, recommendations: [], fromCache: false });
  } catch (error) {
    return next(error);
  }
};

// ── POST /api/recommendations/feedback ───────────────────────────────────────
export const submitFeedback = async (req, res, next) => {
  const { productId, action } = req.body;
  try {
    if (!productId || !["like", "dismiss"].includes(action)) {
      return next(new AppError('action must be "like" or "dismiss" and productId is required.', 400));
    }

    const key = `${req.user._id}:${productId}`;
    feedbackLog.set(key, { action, ts: new Date() });

    return res.json({ success: true, message: "Feedback recorded." });
  } catch (error) {
    return next(error);
  }
};
