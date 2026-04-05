/**
 * AI Recommendation Pipeline — 7-node assembly line.
 *
 * State flows through each node sequentially.
 * Any node can throw to trigger the fallback path.
 * Privacy: only product name, category, and truncated description (80 chars)
 *          ever leave the server toward Gemini — no IDs, prices, or user data.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import md5 from "md5";
import Product from "../models/Product.js";

// ─── In-memory recommendation cache ─────────────────────────────────────────
// Key: `${userId}:${cartHash}`  Value: { recommendations, usedFallback, cachedAt }
const recommendationCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const getCachedRecommendations = (userId, cartHash) => {
  const key = `${userId}:${cartHash}`;
  const cached = recommendationCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
    recommendationCache.delete(key);
    return null;
  }
  return cached;
};

export const setCachedRecommendations = (userId, cartHash, data) => {
  const key = `${userId}:${cartHash}`;
  recommendationCache.set(key, { ...data, cachedAt: Date.now() });
};

/**
 * Build a deterministic MD5 hash from the cart state:
 * sorted `productId:qty` pairs → joined string → MD5
 */
export const buildCartHash = (cartItems) => {
  const sorted = Object.entries(cartItems)
    .filter(([, qty]) => qty > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, qty]) => `${id}:${qty}`)
    .join("|");
  return md5(sorted);
};

// ─── Gemini client (lazy init) ────────────────────────────────────────────────
let genAI = null;
const getGenAI = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

// ─── Sleep helper ─────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── NODE 1: Analyze Cart ─────────────────────────────────────────────────────
const analyzeCart = (state) => {
  const { cartProducts } = state;

  const categories = [...new Set(cartProducts.map((p) => p.category))];
  const prices = cartProducts.map((p) => p.offerPrice || p.price || 0);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  const keywords = cartProducts
    .flatMap((p) => [
      ...p.name.toLowerCase().split(/\s+/),
      ...((p.description || "").toLowerCase().split(/\s+/).slice(0, 8)),
    ])
    .filter((w) => w.length > 3);

  const keywordSet = new Set(keywords);

  return { ...state, cartProfile: { categories, avgPrice, keywordSet } };
};

// ─── NODE 2: Filter Catalog ───────────────────────────────────────────────────
const filterCatalog = (state) => {
  const { availableProducts, cartProfile, cartProductIds } = state;
  const { categories, avgPrice, keywordSet } = cartProfile;

  const scored = availableProducts.map((p) => {
    let score = 0;

    // Category match
    if (categories.includes(p.category)) score += 10;

    // Price proximity (within 50% of avg)
    const price = p.offerPrice || p.price || 0;
    if (avgPrice > 0 && Math.abs(price - avgPrice) / avgPrice < 0.5) score += 5;

    // Keyword overlap
    const productWords = new Set([
      ...p.name.toLowerCase().split(/\s+/),
      ...((p.description || "").toLowerCase().split(/\s+/).slice(0, 8)),
    ]);
    for (const w of keywordSet) {
      if (productWords.has(w)) score += 2;
    }

    return { product: p, score };
  });

  // Sort descending, take top 20
  const top20 = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ product }) => product);

  return { ...state, filteredCatalog: top20 };
};

// ─── NODE 3: Build Prompt ─────────────────────────────────────────────────────
const buildPrompt = (state) => {
  const { cartProducts, filteredCatalog } = state;

  const cartList = cartProducts
    .map((p) => `- ${p.name} (${p.category})`)
    .join("\n");

  // Privacy rule: name + category + description (≤80 chars) only — NO ids, prices, user data
  const catalogList = filteredCatalog
    .map((p) => `${p.name} | ${p.category} | ${(p.description || "").slice(0, 80)}`)
    .join("\n");

  const prompt = `You are a smart grocery assistant recommending complementary products.

Customer's current cart:
${cartList}

Available products (Name | Category | Description):
${catalogList}

Task: Recommend up to 6 products from ONLY the list above that best complement the cart.

Rules:
- Only recommend products whose EXACT NAME appears in the catalog list above.
- Do NOT invent products.
- Do NOT repeat products already in the cart.
- Prioritise complementary pairings (bread → butter, pasta → sauce, coffee → milk).
- Keep reason under 12 words.

Few-shot example output:
{"recommendations":[{"name":"Amul Butter 100g","reason":"Perfect spread for bread","priority":1}]}

Return ONLY valid JSON with no markdown fences, no extra text:
{"recommendations":[{"name":"<exact product name>","reason":"<short reason>","priority":<1-6>}]}`;

  return { ...state, prompt };
};

// ─── NODE 4: Call Gemini (with exponential backoff retry) ─────────────────────
const callGemini = async (state) => {
  const { prompt } = state;
  const model = getGenAI().getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  });

  const MAX_ATTEMPTS = 3;
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const rawText = result.response.text().trim();
      return { ...state, rawText };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.warn(`Gemini attempt ${attempt} failed. Retrying in ${delay}ms…`);
        await sleep(delay);
      }
    }
  }

  throw new Error(`Gemini failed after ${MAX_ATTEMPTS} attempts: ${lastError?.message}`);
};

// ─── NODE 5: Parse & Validate ─────────────────────────────────────────────────
const parseAndValidate = (state) => {
  const { rawText } = state;

  // Strip markdown code fences if Gemini added them anyway
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Gemini response was not valid JSON.");
  }

  const suggestions = (parsed.recommendations || []).filter(
    (s) => s && typeof s.name === "string" && s.name.trim()
  );

  if (suggestions.length === 0) {
    throw new Error("Gemini returned no valid suggestions.");
  }

  return { ...state, geminiSuggestions: suggestions };
};

// ─── NODE 6: Match to Database ────────────────────────────────────────────────
const matchToDB = (state) => {
  const { geminiSuggestions, filteredCatalog, availableProducts } = state;

  // Build lookup maps: normalizedName → product
  const catalogByNorm = new Map();
  for (const p of availableProducts) {
    catalogByNorm.set(p.name.toLowerCase().trim(), p);
  }

  const fuzzyScore = (suggestion, product) => {
    const s = suggestion.toLowerCase().trim();
    const p = product.name.toLowerCase().trim();
    if (s === p) return 100;                                      // exact match
    if (p.includes(s) || s.includes(p)) return 70;              // substring
    const sWords = new Set(s.split(/\s+/));
    const pWords = p.split(/\s+/);
    const overlap = pWords.filter((w) => sWords.has(w)).length;
    return overlap > 0 ? 30 + overlap * 10 : 0;                  // word overlap
  };

  const usedIds = new Set();
  const matched = [];

  const sortedSuggestions = [...geminiSuggestions].sort(
    (a, b) => (a.priority || 99) - (b.priority || 99)
  );

  for (const suggestion of sortedSuggestions) {
    if (matched.length >= 6) break;

    // Find best-scoring product for this suggestion
    let bestProduct = null;
    let bestScore = 0;

    for (const p of availableProducts) {
      const score = fuzzyScore(suggestion.name, p);
      if (score > bestScore) {
        bestScore = score;
        bestProduct = p;
      }
    }

    if (bestProduct && bestScore >= 30 && !usedIds.has(String(bestProduct._id))) {
      usedIds.add(String(bestProduct._id));
      matched.push({ product: bestProduct, reason: suggestion.reason, priority: suggestion.priority });
    }
  }

  return { ...state, matchedProducts: matched, usedIds };
};

// ─── NODE 7: Enrich ───────────────────────────────────────────────────────────
const enrich = (state) => {
  const { matchedProducts, availableProducts, cartProfile, usedIds } = state;

  let recommendations = matchedProducts.map(({ product: p, reason }) => ({
    _id: p._id,
    name: p.name,
    category: p.category,
    price: p.price,
    offerPrice: p.offerPrice,
    image: p.image,
    inStock: p.inStock,
    reason: reason || "Great complement to your cart",
  }));

  // Pad to minimum 4 with popular in-stock items from same categories if needed
  if (recommendations.length < 4) {
    const padCandidates = availableProducts.filter(
      (p) =>
        cartProfile.categories.includes(p.category) &&
        p.inStock &&
        !usedIds.has(String(p._id))
    );

    for (const p of padCandidates) {
      if (recommendations.length >= 4) break;
      usedIds.add(String(p._id));
      recommendations.push({
        _id: p._id,
        name: p.name,
        category: p.category,
        price: p.price,
        offerPrice: p.offerPrice,
        image: p.image,
        inStock: p.inStock,
        reason: `More from ${p.category} — pairs well with your cart`,
      });
    }
  }

  return { ...state, recommendations };
};

// ─── FALLBACK Node ────────────────────────────────────────────────────────────
const fallback = async (state) => {
  const { cartProductIds, cartProfile } = state;

  console.warn("⚠️  Recommendation pipeline failed — using DB fallback.");

  const fallbackProducts = await Product.find({
    _id: { $nin: cartProductIds },
    inStock: true,
    category: { $in: cartProfile?.categories || [] },
  }).limit(6);

  const recommendations = fallbackProducts.map((p) => ({
    _id: p._id,
    name: p.name,
    category: p.category,
    price: p.price,
    offerPrice: p.offerPrice,
    image: p.image,
    inStock: p.inStock,
    reason: `Popular in ${p.category}`,
  }));

  return { ...state, recommendations, usedFallback: true };
};

// ─── Pipeline Runner ──────────────────────────────────────────────────────────
export const runRecommendationPipeline = async ({ cartProducts, availableProducts, cartProductIds }) => {
  let state = {
    cartProducts,
    availableProducts,
    cartProductIds,
    cartProfile: null,
    filteredCatalog: [],
    prompt: "",
    rawText: "",
    geminiSuggestions: [],
    matchedProducts: [],
    usedIds: new Set(),
    recommendations: [],
    usedFallback: false,
  };

  try {
    // Synchronous nodes
    state = analyzeCart(state);
    state = filterCatalog(state);
    state = buildPrompt(state);

    // Async nodes
    state = await callGemini(state);
    state = parseAndValidate(state);
    state = matchToDB(state);
    state = enrich(state);
  } catch (err) {
    console.error("Pipeline error:", err.message);
    state = await fallback(state);
  }

  return {
    recommendations: state.recommendations,
    usedFallback: state.usedFallback,
  };
};
