import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";

const ProductCard = ({ product }) => {
  const { addToCart, removeFromCart, cartItems, BACKEND_URL, isWishlisted, toggleWishlist, isSeller } = useApp();
  const qty = cartItems[product._id] || 0;
  const maxStock = typeof product.quantity === "number" ? product.quantity : null;
  const atMax = maxStock !== null && qty >= maxStock;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const wishlisted = isWishlisted(product._id);

  const imageUrl =
    product.image && product.image.length > 0
      ? product.image[0].startsWith("http")
        ? product.image[0]
        : `${BACKEND_URL}${product.image[0]}`
      : null;

  const discount =
    product.price > 0
      ? Math.round(((product.price - product.offerPrice) / product.price) * 100)
      : 0;

  const handleAddToCart = () => {
    addToCart(product._id);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1200);
  };

  return (
    <div className="card group hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 flex flex-col">
      {/* Image */}
      <Link to={`/product/${product._id}`} className="block relative overflow-hidden bg-gray-50">
        {/* Shimmer while loading */}
        {!imageLoaded && imageUrl && (
          <div className="skeleton w-full h-48" />
        )}

        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500 ${!imageLoaded ? "opacity-0 absolute inset-0" : ""}`}
          />
        ) : (
          <div className="w-full h-48 flex items-center justify-center text-5xl bg-gradient-to-br from-green-50 to-emerald-100">
            🥬
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {discount > 0 && (
            <span className="bg-accent-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
              -{discount}%
            </span>
          )}
          {!product.inStock && (
            <span className="bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
              Out of Stock
            </span>
          )}
        </div>

        {!isSeller && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product._id);
            }}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform duration-150"
          >
            <svg
              className={`w-4 h-4 transition-colors duration-200 ${wishlisted ? "text-red-500 fill-current" : "text-gray-400"}`}
              viewBox="0 0 24 24"
              stroke="currentColor"
              fill={wishlisted ? "currentColor" : "none"}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        )}
      </Link>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <span className="text-xs font-medium text-primary-600 uppercase tracking-wider">
          {product.category}
        </span>
        <Link to={`/product/${product._id}`}>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 hover:text-primary-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center gap-2 mt-auto">
          <span className="text-lg font-bold text-gray-900">₹{product.offerPrice}</span>
          {product.price > product.offerPrice && (
            <span className="text-sm text-gray-400 line-through">₹{product.price}</span>
          )}
          {discount > 0 && (
            <span className="text-xs font-semibold text-accent-600 ml-auto">{discount}% off</span>
          )}
        </div>

        {/* Cart Controls */}
        {product.inStock ? (
          qty === 0 ? (
            <button
              id={`add-to-cart-${product._id}`}
              onClick={handleAddToCart}
              className={`w-full text-sm mt-1 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                addedFeedback
                  ? "bg-green-500 text-white"
                  : "btn-primary"
              }`}
            >
              {addedFeedback ? "✓ Added!" : "Add to Cart"}
            </button>
          ) : (
            <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-xl p-1 mt-1">
              <button
                id={`decrement-${product._id}`}
                onClick={() => removeFromCart(product._id)}
                className="w-8 h-8 rounded-lg bg-white border border-primary-200 text-primary-700 font-bold text-lg flex items-center justify-center hover:bg-primary-100 transition-colors"
              >
                −
              </button>
              <span className="font-bold text-primary-800">{qty}</span>
              <button
                id={`increment-${product._id}`}
                type="button"
                disabled={atMax}
                onClick={() => addToCart(product._id)}
                className="w-8 h-8 rounded-lg bg-white border border-primary-200 text-primary-700 font-bold text-lg flex items-center justify-center hover:bg-primary-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          )
        ) : (
          <button
            disabled
            className="w-full py-2 rounded-xl bg-gray-100 text-gray-400 text-sm font-semibold cursor-not-allowed mt-1"
          >
            Out of Stock
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
