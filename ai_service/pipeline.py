"""
AI Recommendation Pipeline — Python / LangGraph port.

Mirrors the 7-node JS pipeline in recommendationPipeline.js exactly:

  Node 1  analyze_cart       — build cart profile (categories, avg price, keywords)
  Node 2  filter_catalog     — score & top-20 candidates
  Node 3  build_prompt       — construct Gemini prompt
  Node 4  call_gemini        — invoke Gemini with exponential-backoff retry
  Node 5  parse_and_validate — parse JSON response, validate suggestions
  Node 6  match_to_db        — fuzzy-match suggestions back to real products
  Node 7  enrich             — pad to min-4, build final response objects

On any node failure the graph routes to the `fallback` node which returns
category-matched in-stock products from the available catalog.

Architecture:
  - State is a TypedDict flowing through each node.
  - Edges are conditional: success → next node, error → fallback.
  - Uses LangGraph's StateGraph with explicit node wiring.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import time
import hashlib
import logging
from typing import Any, Dict, List, Optional, Set, TypedDict

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, END

from models import ProductSummary, RecommendedProduct

logger = logging.getLogger(__name__)


# ── In-memory recommendation cache ─────────────────────────────────────────
# Key: f"{user_id}:{cart_hash}"  Value: dict with recommendations + timestamp
_recommendation_cache: Dict[str, dict] = {}
CACHE_TTL_SECONDS = 5 * 60  # 5 minutes


def build_cart_hash(cart_items: Dict[str, int]) -> str:
    """
    Deterministic MD5 hash of the cart state.
    Mirrors buildCartHash() in recommendationPipeline.js.
    """
    sorted_pairs = sorted(
        (f"{pid}:{qty}" for pid, qty in cart_items.items() if qty > 0)
    )
    raw = "|".join(sorted_pairs)
    return hashlib.md5(raw.encode()).hexdigest()


def get_cached_recommendations(user_id: str, cart_hash: str) -> Optional[dict]:
    key = f"{user_id}:{cart_hash}"
    entry = _recommendation_cache.get(key)
    if not entry:
        return None
    if time.time() - entry["cached_at"] > CACHE_TTL_SECONDS:
        del _recommendation_cache[key]
        return None
    return entry


def set_cached_recommendations(user_id: str, cart_hash: str, data: dict) -> None:
    key = f"{user_id}:{cart_hash}"
    _recommendation_cache[key] = {**data, "cached_at": time.time()}


# ── Pipeline State ───────────────────────────────────────────────────────────

class PipelineState(TypedDict):
    # Inputs
    cart_products: List[ProductSummary]
    available_products: List[ProductSummary]
    cart_product_ids: List[str]

    # Intermediate
    cart_profile: Optional[Dict[str, Any]]
    filtered_catalog: List[ProductSummary]
    prompt: str
    raw_text: str
    gemini_suggestions: List[Dict[str, Any]]
    matched_products: List[Dict[str, Any]]
    used_ids: Set[str]

    # Output
    recommendations: List[Dict[str, Any]]
    used_fallback: bool
    error: Optional[str]   # set when a node fails — triggers fallback routing


# ── Node 1: Analyze Cart ─────────────────────────────────────────────────────

def analyze_cart(state: PipelineState) -> PipelineState:
    try:
        cart_products = state["cart_products"]
        categories = list({p.category for p in cart_products})

        prices = [p.offer_price or p.price or 0.0 for p in cart_products]
        avg_price = sum(prices) / len(prices) if prices else 0.0

        keywords: Set[str] = set()
        for p in cart_products:
            for word in p.name.lower().split():
                if len(word) > 3:
                    keywords.add(word)
            desc_words = (p.description or "").lower().split()[:8]
            for word in desc_words:
                if len(word) > 3:
                    keywords.add(word)

        return {
            **state,
            "cart_profile": {
                "categories": categories,
                "avg_price": avg_price,
                "keyword_set": keywords,
            },
            "error": None,
        }
    except Exception as exc:
        logger.error("analyze_cart failed: %s", exc)
        return {**state, "error": str(exc)}


# ── Node 2: Filter Catalog ───────────────────────────────────────────────────

def filter_catalog(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    try:
        available = state["available_products"]
        cart_profile = state["cart_profile"]
        categories = cart_profile["categories"]
        avg_price = cart_profile["avg_price"]
        keyword_set = cart_profile["keyword_set"]

        scored = []
        for p in available:
            score = 0

            if p.category in categories:
                score += 10

            price = p.offer_price or p.price or 0.0
            if avg_price > 0 and abs(price - avg_price) / avg_price < 0.5:
                score += 5

            product_words = set(p.name.lower().split())
            product_words.update((p.description or "").lower().split()[:8])
            overlap = keyword_set & product_words
            score += len(overlap) * 2

            scored.append((score, p))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_20 = [p for _, p in scored[:20]]

        return {**state, "filtered_catalog": top_20}
    except Exception as exc:
        logger.error("filter_catalog failed: %s", exc)
        return {**state, "error": str(exc)}


# ── Node 3: Build Prompt ─────────────────────────────────────────────────────

def build_prompt(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    try:
        cart_products = state["cart_products"]
        filtered_catalog = state["filtered_catalog"]

        cart_list = "\n".join(
            f"- {p.name} ({p.category})" for p in cart_products
        )
        # Privacy: name + category + description only — no IDs, prices, user data
        catalog_list = "\n".join(
            f"{p.name} | {p.category} | {(p.description or '')[:80]}"
            for p in filtered_catalog
        )

        prompt = f"""You are a smart grocery assistant recommending complementary products.

Customer's current cart:
{cart_list}

Available products (Name | Category | Description):
{catalog_list}

Task: Recommend up to 6 products from ONLY the list above that best complement the cart.

Rules:
- Only recommend products whose EXACT NAME appears in the catalog list above.
- Do NOT invent products.
- Do NOT repeat products already in the cart.
- Prioritise complementary pairings (bread → butter, pasta → sauce, coffee → milk).
- Keep reason under 12 words.

Few-shot example output:
{{"recommendations":[{{"name":"Amul Butter 100g","reason":"Perfect spread for bread","priority":1}}]}}

Return ONLY valid JSON with no markdown fences, no extra text:
{{"recommendations":[{{"name":"<exact product name>","reason":"<short reason>","priority":<1-6>}}]}}"""

        return {**state, "prompt": prompt}
    except Exception as exc:
        logger.error("build_prompt failed: %s", exc)
        return {**state, "error": str(exc)}


# ── Node 4: Call Gemini (with exponential-backoff retry) ────────────────────

async def call_gemini(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    try:
        api_key = os.getenv("GEMINI_API_KEY", "")
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

        if not api_key or api_key == "your_gemini_api_key_here":
            raise ValueError("GEMINI_API_KEY is not configured.")

        llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=0.2,
        )

        MAX_ATTEMPTS = 3
        last_error: Optional[Exception] = None

        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                response = await llm.ainvoke([HumanMessage(content=state["prompt"])])
                raw_text = response.content.strip()
                return {**state, "raw_text": raw_text}
            except Exception as exc:
                last_error = exc
                if attempt < MAX_ATTEMPTS:
                    delay = (2 ** (attempt - 1))  # 1s, 2s
                    logger.warning(
                        "Gemini attempt %d failed (%s). Retrying in %ds…",
                        attempt, exc, delay,
                    )
                    await asyncio.sleep(delay)

        raise RuntimeError(
            f"Gemini failed after {MAX_ATTEMPTS} attempts: {last_error}"
        )
    except Exception as exc:
        logger.error("call_gemini failed: %s", exc)
        return {**state, "error": str(exc)}


# ── Node 5: Parse & Validate ─────────────────────────────────────────────────

def parse_and_validate(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    try:
        raw = state["raw_text"]

        # Strip markdown code fences if Gemini added them anyway
        cleaned = re.sub(r"^```json\s*", "", raw, flags=re.IGNORECASE)
        cleaned = re.sub(r"^```\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.IGNORECASE).strip()

        parsed = json.loads(cleaned)
        suggestions = [
            s for s in (parsed.get("recommendations") or [])
            if s and isinstance(s.get("name"), str) and s["name"].strip()
        ]

        if not suggestions:
            raise ValueError("Gemini returned no valid suggestions.")

        return {**state, "gemini_suggestions": suggestions}
    except Exception as exc:
        logger.error("parse_and_validate failed: %s", exc)
        return {**state, "error": str(exc)}


# ── Node 6: Match to Database ────────────────────────────────────────────────

def match_to_db(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    try:
        suggestions = state["gemini_suggestions"]
        available = state["available_products"]

        def fuzzy_score(suggestion_name: str, product: ProductSummary) -> int:
            s = suggestion_name.lower().strip()
            p = product.name.lower().strip()
            if s == p:
                return 100
            if p in s or s in p:
                return 70
            s_words = set(s.split())
            p_words = p.split()
            overlap = sum(1 for w in p_words if w in s_words)
            return 30 + overlap * 10 if overlap > 0 else 0

        used_ids: Set[str] = set()
        matched = []

        sorted_suggestions = sorted(
            suggestions, key=lambda x: x.get("priority", 99)
        )

        for suggestion in sorted_suggestions:
            if len(matched) >= 6:
                break

            best_product: Optional[ProductSummary] = None
            best_score = 0

            for p in available:
                score = fuzzy_score(suggestion["name"], p)
                if score > best_score:
                    best_score = score
                    best_product = p

            if best_product and best_score >= 30 and best_product.id not in used_ids:
                used_ids.add(best_product.id)
                matched.append({
                    "product": best_product,
                    "reason": suggestion.get("reason", ""),
                    "priority": suggestion.get("priority", 99),
                })

        return {**state, "matched_products": matched, "used_ids": used_ids}
    except Exception as exc:
        logger.error("match_to_db failed: %s", exc)
        return {**state, "error": str(exc)}


# ── Node 7: Enrich ───────────────────────────────────────────────────────────

def enrich(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    try:
        matched = state["matched_products"]
        available = state["available_products"]
        cart_profile = state["cart_profile"]
        used_ids: Set[str] = set(state.get("used_ids", set()))

        recommendations = []
        for item in matched:
            p: ProductSummary = item["product"]
            recommendations.append({
                "_id": p.id,
                "name": p.name,
                "category": p.category,
                "price": p.price,
                "offerPrice": p.offer_price,
                "image": p.image or [],
                "inStock": p.in_stock,
                "reason": item["reason"] or "Great complement to your cart",
            })

        # Pad to minimum 4 with same-category in-stock items
        if len(recommendations) < 4:
            pad_candidates = [
                p for p in available
                if p.category in cart_profile["categories"]
                and p.in_stock
                and p.id not in used_ids
            ]
            for p in pad_candidates:
                if len(recommendations) >= 4:
                    break
                used_ids.add(p.id)
                recommendations.append({
                    "_id": p.id,
                    "name": p.name,
                    "category": p.category,
                    "price": p.price,
                    "offerPrice": p.offer_price,
                    "image": p.image or [],
                    "inStock": p.in_stock,
                    "reason": f"More from {p.category} — pairs well with your cart",
                })

        return {**state, "recommendations": recommendations, "used_fallback": False}
    except Exception as exc:
        logger.error("enrich failed: %s", exc)
        return {**state, "error": str(exc)}


# ── Fallback Node ─────────────────────────────────────────────────────────────

def fallback(state: PipelineState) -> PipelineState:
    logger.warning("⚠️  Recommendation pipeline failed — using DB fallback. Reason: %s", state.get("error"))

    available = state.get("available_products", [])
    cart_product_ids = set(state.get("cart_product_ids", []))
    cart_profile = state.get("cart_profile") or {}
    categories = cart_profile.get("categories", [])

    fallback_products = [
        p for p in available
        if p.id not in cart_product_ids
        and p.in_stock
        and (not categories or p.category in categories)
    ][:6]

    recommendations = [
        {
            "_id": p.id,
            "name": p.name,
            "category": p.category,
            "price": p.price,
            "offerPrice": p.offer_price,
            "image": p.image or [],
            "inStock": p.in_stock,
            "reason": f"Popular in {p.category}",
        }
        for p in fallback_products
    ]

    return {
        **state,
        "recommendations": recommendations,
        "used_fallback": True,
        "error": None,
    }


# ── Route helper: after any node, go to fallback if error is set ─────────────

def route_or_fallback(next_node: str):
    """Returns a routing function: go to next_node on success, fallback on error."""
    def _route(state: PipelineState) -> str:
        return "fallback" if state.get("error") else next_node
    return _route


# ── Build the LangGraph StateGraph ───────────────────────────────────────────

def build_pipeline() -> Any:
    graph = StateGraph(PipelineState)

    # Register all nodes
    graph.add_node("analyze_cart", analyze_cart)
    graph.add_node("filter_catalog", filter_catalog)
    graph.add_node("build_prompt", build_prompt)
    graph.add_node("call_gemini", call_gemini)
    graph.add_node("parse_and_validate", parse_and_validate)
    graph.add_node("match_to_db", match_to_db)
    graph.add_node("enrich", enrich)
    graph.add_node("fallback", fallback)

    # Entry point
    graph.set_entry_point("analyze_cart")

    # Edges: each node routes to the next OR to fallback if error is set
    graph.add_conditional_edges("analyze_cart", route_or_fallback("filter_catalog"))
    graph.add_conditional_edges("filter_catalog", route_or_fallback("build_prompt"))
    graph.add_conditional_edges("build_prompt", route_or_fallback("call_gemini"))
    graph.add_conditional_edges("call_gemini", route_or_fallback("parse_and_validate"))
    graph.add_conditional_edges("parse_and_validate", route_or_fallback("match_to_db"))
    graph.add_conditional_edges("match_to_db", route_or_fallback("enrich"))
    graph.add_edge("enrich", END)
    graph.add_edge("fallback", END)

    return graph.compile()


# Compiled pipeline — module-level singleton
_pipeline = None


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = build_pipeline()
    return _pipeline


# ── Public API ────────────────────────────────────────────────────────────────

async def run_recommendation_pipeline(
    cart_products: List[ProductSummary],
    available_products: List[ProductSummary],
    cart_product_ids: List[str],
) -> Dict[str, Any]:
    """
    Entry point called by the FastAPI route handler.
    Returns: { "recommendations": [...], "usedFallback": bool }
    """
    initial_state: PipelineState = {
        "cart_products": cart_products,
        "available_products": available_products,
        "cart_product_ids": cart_product_ids,
        "cart_profile": None,
        "filtered_catalog": [],
        "prompt": "",
        "raw_text": "",
        "gemini_suggestions": [],
        "matched_products": [],
        "used_ids": set(),
        "recommendations": [],
        "used_fallback": False,
        "error": None,
    }

    pipeline = get_pipeline()
    final_state = await pipeline.ainvoke(initial_state)

    return {
        "recommendations": final_state.get("recommendations", []),
        "usedFallback": final_state.get("used_fallback", False),
    }
