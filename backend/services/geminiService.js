import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;

const getGenAI = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      throw new Error("GEMINI_API_KEY is not configured. Please set it in your .env file.");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

/**
 * Get grocery product recommendations from Gemini based on cart context.
 * @param {Array} cartProducts - Array of { name, category, description }
 * @param {Array} catalogSummary - Array of { id, name, category, description }
 *                                 NOTE: each item MUST have an `id` field (MongoDB _id string)
 * @returns {Array} - Array of { id, reason, priority }
 */
export const getGeminiRecommendations = async (cartProducts, catalogSummary) => {
  const model = getGenAI().getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  });

  const cartList = cartProducts
    .map((p) => `- ${p.name} (${p.category})`)
    .join("\n");

  // Include the product ID in each catalog line so Gemini can echo it back exactly
  const catalogList = catalogSummary
    .map((p) => `[${p.id}] ${p.name} | ${p.category} | ${p.description?.slice(0, 80) || ""}`)
    .join("\n");

  const prompt = `You are a smart grocery recommendation engine for an online grocery store.

The customer's current cart contains:
${cartList}

Available products in the store catalog (format: [ID] Name | Category | Description):
${catalogList}

Your task:
Recommend up to 6 products from the catalog above that would complement the customer's cart the best.

Rules:
- Only recommend products whose exact ID appears in the catalog list above. Do NOT invent IDs.
- Do NOT recommend products already in the cart.
- Prioritise complementary items (e.g. bread → butter, pasta → sauce, chicken → spices).
- Give a short, helpful reason for each recommendation (max 10 words).

Return ONLY valid JSON with no markdown, no code fences, no extra text:
{
  "recommendations": [
    {
      "id": "<exact product ID from catalog>",
      "reason": "Short reason why it pairs well",
      "priority": 1
    }
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  return parsed.recommendations || [];
};
