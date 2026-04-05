"""
AI Recommendation Microservice — FastAPI entrypoint.

Exposes a single POST /recommend endpoint consumed by the Node.js backend.
The Node.js recommendation.controller.js calls this service instead of running
the pipeline in-process, keeping the JS backend clean and the AI logic in Python.

Start with:
    uvicorn main:app --host 0.0.0.0 --port 5001 --reload
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import RecommendationRequest, RecommendationResponse
from pipeline import (
    run_recommendation_pipeline,
    build_cart_hash,
    get_cached_recommendations,
    set_cached_recommendations,
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🤖 AI Recommendation Service starting up…")
    yield
    logger.info("🤖 AI Recommendation Service shutting down.")


app = FastAPI(
    title="GMS AI Recommendation Service",
    description="LangGraph-powered grocery recommendation microservice",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow requests from the Node.js backend only
_allowed_origins = os.getenv("AI_SERVICE_ALLOWED_ORIGIN", "http://localhost:5008")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_allowed_origins, "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Liveness probe for the Node.js backend to poll."""
    return {"status": "ok", "service": "ai-recommendation"}


@app.post("/recommend", response_model=RecommendationResponse)
async def recommend(request: RecommendationRequest):
    """
    Main recommendation endpoint.

    Request body (sent by Node.js recommendation.controller.js):
    {
      "cartProducts":       [ { "id", "name", "category", "description",
                                "price", "offerPrice", "inStock", "image" }, … ],
      "availableProducts":  [ … same shape … ],
      "cartProductIds":     [ "id1", "id2", … ]
    }

    Response:
    {
      "success": true,
      "recommendations": [ { "_id", "name", "category", "price", "offerPrice",
                              "image", "inStock", "reason" }, … ],
      "usedFallback": false
    }
    """
    if not request.cart_products:
        return RecommendationResponse(
            success=True,
            recommendations=[],
            usedFallback=False,
        )

    # ── Check cache ──────────────────────────────────────────────────────────
    # Build a synthetic cart_items dict {id: 1} for hashing purposes.
    # (The Python service doesn't receive per-item quantities; use presence only.)
    cart_items_for_hash = {pid: 1 for pid in request.cart_product_ids}
    cart_hash = build_cart_hash(cart_items_for_hash)

    # We use a fixed user key here because the Node.js layer handles per-user
    # caching. The Python service is stateless across users.
    CACHE_USER_KEY = "ai_service"
    cached = get_cached_recommendations(CACHE_USER_KEY, cart_hash)
    if cached:
        logger.info("Serving recommendations from cache (hash=%s)", cart_hash)
        return RecommendationResponse(
            success=True,
            recommendations=cached["recommendations"],
            usedFallback=cached.get("usedFallback", False),
        )

    # ── Run pipeline ─────────────────────────────────────────────────────────
    try:
        result = await run_recommendation_pipeline(
            cart_products=request.cart_products,
            available_products=request.available_products,
            cart_product_ids=request.cart_product_ids,
        )
    except Exception as exc:
        logger.exception("Unhandled pipeline error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Recommendation pipeline error: {exc}")

    # ── Cache and return ─────────────────────────────────────────────────────
    set_cached_recommendations(CACHE_USER_KEY, cart_hash, result)

    return RecommendationResponse(
        success=True,
        recommendations=result.get("recommendations", []),
        usedFallback=result.get("usedFallback", False),
    )
