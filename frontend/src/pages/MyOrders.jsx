import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useApp } from "../context/AppContext";
import { Link } from "react-router-dom";
import ReviewForm from "../components/ReviewForm";
import { StarDisplay } from "../components/StarRating";

function normalizeStatus(status) {
  if (status === "delivered" || status === "Delivered") return "delivered";
  return "placed";
}

const STATUS_STYLE = {
  placed: { label: "Placed", emoji: "🟡", className: "bg-amber-100 text-amber-800 border border-amber-200" },
  delivered: { label: "Delivered", emoji: "🟢", className: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
};

const MyOrders = () => {
  const { user, BACKEND_URL } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalOrder, setReviewModalOrder] = useState(null);

  const loadOrders = useCallback(() => {
    if (!user) return;
    setLoading(true);
    axios
      .get(`${BACKEND_URL}/api/order/user`)
      .then(({ data }) => {
        if (data.success) setOrders(data.orders);
      })
      .finally(() => setLoading(false));
  }, [user, BACKEND_URL]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!reviewModalOrder) return;
    const onEsc = (e) => {
      if (e.key === "Escape") setReviewModalOrder(null);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [reviewModalOrder]);

  const handleReviewSuccess = (updatedOrder) => {
    setOrders((prev) => prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)));
    setReviewModalOrder(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <span className="text-6xl">🔒</span>
          <h2 className="text-2xl font-bold">Login to view your orders</h2>
          <Link to="/login" className="btn-primary inline-block">
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="page-title mb-8">My Orders</h1>

        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-6 space-y-3">
                <div className="skeleton h-4 w-1/4 rounded" />
                <div className="skeleton h-20 w-full rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="text-7xl">📦</span>
            <h2 className="text-2xl font-bold text-gray-800">No orders yet</h2>
            <p className="text-gray-500">When you place an order, it&apos;ll appear here.</p>
            <Link to="/" className="btn-primary">
              Start Shopping
            </Link>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => {
              const st = normalizeStatus(order.status);
              const badge = STATUS_STYLE[st];
              const delivered = st === "delivered";
              const hasReview = order.review != null && order.review.rating != null;

              return (
                <div key={order._id} className="card p-6 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-xs text-gray-500 font-mono">
                        Order #{order._id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      {delivered && order.deliveredAt && (
                        <p className="text-xs text-emerald-600 mt-0.5">
                          Delivered{" "}
                          {new Date(order.deliveredAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${badge.className}`}
                    >
                      <span aria-hidden>{badge.emoji}</span>
                      {badge.label}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {order.items.map((item, i) => {
                      const p = item.product;
                      if (!p) return null;
                      const imageUrl =
                        p.image && p.image.length > 0
                          ? p.image[0].startsWith("http")
                            ? p.image[0]
                            : `${BACKEND_URL}${p.image[0]}`
                          : null;
                      return (
                        <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                            {imageUrl ? (
                              <img src={imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl">🛒</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                            <p className="text-xs text-gray-500">
                              Qty: {item.quantity} · ₹{p.offerPrice} each
                            </p>
                          </div>
                          <p className="font-bold text-gray-900 text-sm">
                            ₹{(p.offerPrice * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {delivered && hasReview && (
                    <div className="bg-primary-50/80 border border-primary-100 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-primary-800 uppercase tracking-wide">Your review</p>
                      <StarDisplay value={order.review.rating} />
                      {order.review.comment ? (
                        <p className="text-sm text-gray-700 leading-relaxed">{order.review.comment}</p>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No written comment</p>
                      )}
                    </div>
                  )}

                  {delivered && !hasReview && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setReviewModalOrder(order)}
                        className="text-sm font-semibold text-primary-700 hover:text-primary-800 bg-primary-50 border border-primary-200 px-4 py-2 rounded-xl transition-colors"
                      >
                        Write review
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      {order.paymentType} · {order.isPaid ? "Paid" : "Pay on delivery"}
                    </div>
                    <div className="font-bold text-gray-900">Total: ₹{order.amount.toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reviewModalOrder && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          onClick={() => setReviewModalOrder(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="review-modal-title" className="text-lg font-bold text-gray-900 mb-1">
              Rate your order
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Order #{reviewModalOrder._id.slice(-8).toUpperCase()}
            </p>
            <ReviewForm
              orderId={reviewModalOrder._id}
              onSuccess={handleReviewSuccess}
              onCancel={() => setReviewModalOrder(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;
