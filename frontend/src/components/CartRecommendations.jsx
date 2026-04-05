import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { submitFeedback } from "../services/recommendationApi";

const SkeletonCard = () => (
  <div className="card-ai p-4 space-y-3">
    <div className="skeleton-ai h-36 w-full rounded-xl" />
    <div className="skeleton-ai h-3 w-1/2 rounded" />
    <div className="skeleton-ai h-4 w-3/4 rounded" />
    <div className="skeleton-ai h-4 w-1/3 rounded" />
    <div className="skeleton-ai h-10 w-full rounded-xl" />
  </div>
);

const ThinkingState = () => (
  <div className="flex flex-col items-center justify-center py-10 gap-4">
    <div className="relative">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ai-500 to-ai-700 flex items-center justify-center shadow-glow-purple animate-thinking">
        <span className="text-3xl">✨</span>
      </div>
      {/* Orbiting dots */}
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-ai-400 rounded-full animate-ping" />
    </div>
    <div className="text-center">
      <p className="text-sm font-semibold text-ai-700 animate-thinking">AI is thinking…</p>
      <p className="text-xs text-gray-400 mt-1">Analysing your cart for the best picks</p>
    </div>
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-ai-400 rounded-full animate-thinking"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  </div>
);

const CartRecommendations = () => {
  const {
    recommendations,
    isRecommendationLoading,
    recommendationError,
    fetchRecommendations,
    addToCart,
    removeFromCart,
    cartItems,
    BACKEND_URL,
    user,
  } = useApp();

  // Delay: show "thinking" for 1.5s before switching to skeletons
  const [showThinking, setShowThinking] = useState(false);
  const [expandedReason, setExpandedReason] = useState(null);

  useEffect(() => {
    if (isRecommendationLoading) {
      setShowThinking(true);
      const t = setTimeout(() => setShowThinking(false), 1500);
      return () => clearTimeout(t);
    } else {
      setShowThinking(false);
    }
  }, [isRecommendationLoading]);

  const handleFeedback = async (productId, action) => {
    try {
      await submitFeedback(productId, action);
    } catch {
      // Silent — feedback is non-critical
    }
  };

  if (!user) return null;

  const inLoadingPhase = isRecommendationLoading;

  return (
    <div className="mt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-ai-500 to-ai-700 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white text-sm">✨</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">AI Picks</h2>
            <p className="text-xs text-ai-600 font-medium">AI-powered · based on your cart</p>
          </div>
        </div>
        <button
          id="refresh-recommendations-btn"
          onClick={fetchRecommendations}
          disabled={isRecommendationLoading}
          className="flex items-center gap-2 text-sm text-ai-600 hover:text-ai-700 font-medium border border-ai-200 rounded-xl px-3 py-1.5 hover:bg-ai-50 transition-all disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${isRecommendationLoading ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isRecommendationLoading ? "Thinking…" : "Refresh"}
        </button>
      </div>

      {/* "AI is thinking…" animated pre-state */}
      {inLoadingPhase && showThinking && <ThinkingState />}

      {/* Skeleton cards after thinking delay */}
      {inLoadingPhase && !showThinking && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error State */}
      {!inLoadingPhase && recommendationError && (
        <div className="flex flex-col items-center justify-center py-10 gap-4 bg-red-50 rounded-2xl border border-red-100">
          <span className="text-4xl">😕</span>
          <p className="text-sm text-red-600 font-medium">{recommendationError}</p>
          <button onClick={fetchRecommendations} className="btn-primary text-sm">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!inLoadingPhase && !recommendationError && recommendations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 bg-ai-50 rounded-2xl border border-ai-100">
          <span className="text-4xl">✨</span>
          <p className="text-sm text-ai-700 font-medium">
            Add items to your cart for AI-powered picks
          </p>
        </div>
      )}

      {/* Recommendation Cards */}
      {!inLoadingPhase && recommendations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {recommendations.map((rec) => {
            const imageUrl =
              rec.image && rec.image.length > 0
                ? rec.image[0].startsWith("http")
                  ? rec.image[0]
                  : `${BACKEND_URL}${rec.image[0]}`
                : null;
            const qty = cartItems[rec._id] || 0;
            const maxStock = typeof rec.quantity === "number" ? rec.quantity : null;
            const atMax = maxStock !== null && qty >= maxStock;
            const isExpanded = expandedReason === rec._id;

            return (
              <div
                key={rec._id}
                className="card-ai hover:shadow-glow-purple transition-all duration-300 hover:-translate-y-1 flex flex-col"
              >
                {/* AI reason badge */}
                <div className="bg-gradient-to-r from-ai-600 to-ai-700 px-3 py-1.5 flex items-center gap-2">
                  <span className="text-white text-xs">✨</span>
                  <span className="text-white text-xs font-medium flex-1 truncate">{rec.reason}</span>
                  {/* Expand "?" button */}
                  <button
                    onClick={() => setExpandedReason(isExpanded ? null : rec._id)}
                    className="w-5 h-5 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center hover:bg-white/30 transition-colors flex-shrink-0"
                    aria-label="Why this recommendation?"
                  >
                    ?
                  </button>
                </div>

                {/* Expanded reason */}
                {isExpanded && (
                  <div className="px-3 py-2 bg-ai-50 border-b border-ai-100 animate-fade-in">
                    <p className="text-xs text-ai-700 leading-relaxed">
                      <span className="font-semibold">Why this?</span> {rec.reason}
                    </p>
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => { handleFeedback(rec._id, "like"); setExpandedReason(null); }}
                        className="text-xs text-green-600 hover:underline font-medium"
                      >
                        👍 Useful
                      </button>
                      <button
                        onClick={() => { handleFeedback(rec._id, "dismiss"); setExpandedReason(null); }}
                        className="text-xs text-gray-400 hover:underline"
                      >
                        👎 Not for me
                      </button>
                    </div>
                  </div>
                )}

                {/* Image */}
                <div className="bg-ai-50/50 overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={rec.name}
                      className="w-full h-36 object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-36 flex items-center justify-center text-4xl bg-gradient-to-br from-ai-50 to-ai-100">
                      🥦
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col flex-1 gap-1.5">
                  <span className="text-xs font-semibold text-ai-600 uppercase tracking-wider">
                    {rec.category}
                  </span>
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                    {rec.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-auto">
                    <span className="font-bold text-gray-900">₹{rec.offerPrice}</span>
                    {rec.price > rec.offerPrice && (
                      <span className="text-xs text-gray-400 line-through">₹{rec.price}</span>
                    )}
                  </div>

                  {/* Cart controls — quantity counter once in cart */}
                  {qty === 0 ? (
                    <button
                      id={`rec-add-${rec._id}`}
                      type="button"
                      onClick={() =>
                        addToCart(
                          rec._id,
                          typeof rec.quantity === "number" ? { maxQuantity: rec.quantity } : {}
                        )
                      }
                      className="btn-ai w-full text-sm py-2 mt-1"
                    >
                      Add to Cart
                    </button>
                  ) : (
                    <div className="flex items-center justify-between bg-ai-50 border border-ai-200 rounded-xl p-1 mt-1">
                      <button
                        id={`rec-dec-${rec._id}`}
                        onClick={() => removeFromCart(rec._id)}
                        className="w-7 h-7 rounded-lg bg-white border border-ai-200 text-ai-700 font-bold text-base flex items-center justify-center hover:bg-ai-100 transition-colors"
                      >
                        −
                      </button>
                      <span className="text-sm font-bold text-ai-800">{qty}</span>
                      <button
                        id={`rec-inc-${rec._id}`}
                        type="button"
                        disabled={atMax}
                        onClick={() =>
                          addToCart(
                            rec._id,
                            typeof rec.quantity === "number" ? { maxQuantity: rec.quantity } : {}
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-white border border-ai-200 text-ai-700 font-bold text-base flex items-center justify-center hover:bg-ai-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CartRecommendations;
