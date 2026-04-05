import React, { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import ProductCard from "../components/ProductCard";

const Wishlist = () => {
  const { user, products, wishlistIds, isSeller } = useApp();

  if (isSeller) {
    return <Navigate to="/seller" replace />;
  }

  // Guest guard: show a prompt to log in instead of an empty list
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="card max-w-md mx-auto text-center py-16 px-6">
          <span className="text-5xl block mb-4" aria-hidden>🔒</span>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Log in to see your wishlist</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your wishlist is saved to your account. Log in to see items you've saved.
          </p>
          <Link to="/login" className="btn-primary inline-flex">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  // Resolve full product objects from the wishlist IDs
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const wishlistProducts = useMemo(() => {
    const byId = new Map(products.map((p) => [p._id, p]));
    return wishlistIds.map((id) => byId.get(id)).filter(Boolean);
  }, [products, wishlistIds]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-display">Your wishlist</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Items you save with the heart icon appear here.
          </p>
        </div>

        {wishlistProducts.length === 0 ? (
          <div className="card max-w-md mx-auto text-center py-16 px-6">
            <span className="text-5xl block mb-4" aria-hidden>❤️</span>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Nothing saved yet</h2>
            <p className="text-gray-500 text-sm mb-6">
              Tap the heart on any product to add it to your wishlist.
            </p>
            <Link to="/" className="btn-primary inline-flex">
              Browse shop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
