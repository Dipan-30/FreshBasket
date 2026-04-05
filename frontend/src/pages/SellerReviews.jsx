import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";
import { fetchSellerReviews } from "../services/orderApi";
import { StarDisplay } from "../components/StarRating";

/**
 * @param {{ embedded?: boolean }} props — when true, skip full-page shell & seller redirect (used inside Seller Dashboard tab)
 */
const SellerReviews = ({ embedded = false }) => {
  const { isSeller } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!embedded && !isSeller) {
      navigate("/seller-login");
    }
  }, [embedded, isSeller, navigate]);

  useEffect(() => {
    if (!isSeller && !embedded) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchSellerReviews();
        if (cancelled || !data.success) return;
        setReviews(data.reviews || []);
        setAverageRating(data.averageRating);
        setCount(data.count ?? (data.reviews || []).length);
      } catch {
        if (!cancelled) toast.error("Could not load reviews.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSeller, embedded]);

  const shellClass = embedded ? "" : "min-h-screen bg-gray-50";
  const innerClass = embedded ? "py-0" : "py-10";

  return (
    <div className={shellClass}>
      <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 ${innerClass}`}>
        {!embedded && (
          <div className="mb-8">
            <h1 className="page-title">Customer reviews</h1>
            <p className="text-sm text-gray-500 mt-1">Feedback from delivered orders.</p>
          </div>
        )}
        {embedded && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 font-display">Customer reviews</h2>
            <p className="text-sm text-gray-500 mt-0.5">Feedback from delivered orders.</p>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 space-y-3">
                <div className="skeleton h-5 w-32 rounded" />
                <div className="skeleton h-16 w-full rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <>
            {averageRating != null && count > 0 && (
              <div className="card p-5 mb-6 flex flex-wrap items-center gap-4 border border-primary-100 bg-primary-50/40">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Average rating</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-3xl font-black text-gray-900">{averageRating}</span>
                    <StarDisplay value={averageRating} size="lg" />
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Based on <span className="font-semibold text-gray-900">{count}</span> review{count !== 1 ? "s" : ""}
                </div>
              </div>
            )}

            {reviews.length === 0 ? (
              <div className="text-center py-16 text-gray-500 card border-dashed">
                <span className="text-4xl block mb-2" aria-hidden>
                  ⭐
                </span>
                No reviews yet. When customers rate delivered orders, they will appear here.
              </div>
            ) : (
              <ul className="space-y-4">
                {reviews.map((r) => (
                  <li key={String(r.orderId)} className="card p-5 space-y-3 border border-gray-100">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg" aria-hidden>
                          👤
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {r.user?.name || "Customer"}
                          </p>
                          {r.user?.email && (
                            <p className="text-xs text-gray-500 truncate">{r.user.email}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-400">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StarDisplay value={r.rating} />
                      <span className="text-sm font-bold text-gray-800">{r.rating}/5</span>
                    </div>

                    {r.comment ? (
                      <p className="text-sm text-gray-700 leading-relaxed flex gap-2">
                        <span aria-hidden>💬</span>
                        <span>{r.comment}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No comment</p>
                    )}

                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        📦 Products
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {r.products?.map((p) => (
                          <span
                            key={String(p._id)}
                            className="text-xs bg-gray-100 text-gray-800 px-2.5 py-1 rounded-lg font-medium"
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SellerReviews;
