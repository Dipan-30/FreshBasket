"""
Pydantic models shared across the AI recommendation service.
These mirror the data contracts the Node.js backend sends/receives.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


# ── Inbound (request from Node.js backend) ──────────────────────────────────

class ProductSummary(BaseModel):
    """Slim product representation — only what the pipeline needs."""
    id: str = Field(..., description="MongoDB _id as string")
    name: str
    category: str
    description: Optional[str] = ""
    price: float = 0.0
    offer_price: float = Field(0.0, alias="offerPrice")
    in_stock: bool = Field(True, alias="inStock")
    image: Optional[List[str]] = []

    model_config = {"populate_by_name": True}


class RecommendationRequest(BaseModel):
    cart_products: List[ProductSummary] = Field(..., alias="cartProducts")
    available_products: List[ProductSummary] = Field(..., alias="availableProducts")
    cart_product_ids: List[str] = Field(..., alias="cartProductIds")

    model_config = {"populate_by_name": True}


# ── Outbound (response to Node.js backend) ──────────────────────────────────

class RecommendedProduct(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    category: str
    price: float
    offer_price: float = Field(..., alias="offerPrice")
    image: List[str]
    in_stock: bool = Field(..., alias="inStock")
    reason: str

    model_config = {"populate_by_name": True}


class RecommendationResponse(BaseModel):
    success: bool = True
    recommendations: List[RecommendedProduct]
    used_fallback: bool = Field(False, alias="usedFallback")

    model_config = {"populate_by_name": True}
