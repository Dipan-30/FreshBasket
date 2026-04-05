import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useApp } from "../context/AppContext";
import toast from "react-hot-toast";

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart, removeFromCart, cartItems, BACKEND_URL, isWishlisted, toggleWishlist, isSeller } = useApp();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await axios.get(`${BACKEND_URL}/api/product/id?id=${id}`);
        if (data.success) setProduct(data.product);
      } catch {
        toast.error("Product not found");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="skeleton h-96 rounded-2xl" />
          <div className="space-y-4">
            <div className="skeleton h-8 w-3/4 rounded" />
            <div className="skeleton h-6 w-1/3 rounded" />
            <div className="skeleton h-24 rounded" />
            <div className="skeleton h-12 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const wishlisted = isWishlisted(product._id);
  const qty = cartItems[product._id] || 0;
  const maxStock = typeof product.quantity === "number" ? product.quantity : null;
  const atMax = maxStock !== null && qty >= maxStock;
  const discount =
    product.price > 0
      ? Math.round(((product.price - product.offerPrice) / product.price) * 100)
      : 0;

  const getImageUrl = (img) =>
    img.startsWith("http") ? img : `${BACKEND_URL}${img}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <button onClick={() => navigate("/")} className="hover:text-primary-600 transition-colors">
            Home
          </button>
          <span>/</span>
          <span className="text-primary-600">{product.category}</span>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate max-w-xs">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="card overflow-hidden aspect-square bg-gray-50">
              {product.image && product.image.length > 0 ? (
                <img
                  src={getImageUrl(product.image[selectedImage])}
                  alt={product.name}
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">🛒</div>
              )}
            </div>
            {product.image && product.image.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.image.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImage === i ? "border-primary-500" : "border-gray-200"
                    }`}
                  >
                    <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-5">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="badge badge-green mb-2">{product.category}</span>
                  <h1 className="text-3xl font-bold text-gray-900 leading-tight">{product.name}</h1>
                </div>
                {!isSeller && (
                  <button
                    type="button"
                    onClick={() => toggleWishlist(product._id)}
                    aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    className="flex-shrink-0 w-11 h-11 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <svg
                      className={`w-6 h-6 transition-colors ${wishlisted ? "text-red-500 fill-current" : "text-gray-400"}`}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      fill={wishlisted ? "currentColor" : "none"}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-gray-900">₹{product.offerPrice}</span>
              {product.price > product.offerPrice && (
                <>
                  <span className="text-xl text-gray-400 line-through">₹{product.price}</span>
                  <span className="bg-red-100 text-red-600 text-sm font-bold px-2 py-0.5 rounded-full">
                    {discount}% OFF
                  </span>
                </>
              )}
            </div>

            {/* Stock */}
            <div>
              {product.inStock ? (
                <span className="badge badge-green">✓ In Stock</span>
              ) : (
                <span className="badge badge-red">✗ Out of Stock</span>
              )}
            </div>

            {/* Description */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">About this product</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
            </div>

            {/* Cart Controls */}
            {product.inStock ? (
              qty === 0 ? (
                <button
                  id={`detail-add-cart-${product._id}`}
                  onClick={() =>
                    addToCart(
                      product._id,
                      typeof product.quantity === "number" ? { maxQuantity: product.quantity } : {}
                    )
                  }
                  className="btn-primary w-full text-base py-4"
                >
                  🛒 Add to Cart
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 flex-1 justify-between">
                    <button
                      id={`detail-decrement-${product._id}`}
                      onClick={() => removeFromCart(product._id)}
                      className="w-10 h-10 rounded-xl bg-white border border-primary-200 text-primary-700 font-bold text-xl flex items-center justify-center hover:bg-primary-100 transition-colors"
                    >
                      −
                    </button>
                    <span className="text-xl font-bold text-primary-800">{qty}</span>
                    <button
                      id={`detail-increment-${product._id}`}
                      type="button"
                      disabled={atMax}
                      onClick={() =>
                        addToCart(
                          product._id,
                          typeof product.quantity === "number" ? { maxQuantity: product.quantity } : {}
                        )
                      }
                      className="w-10 h-10 rounded-xl bg-white border border-primary-200 text-primary-700 font-bold text-xl flex items-center justify-center hover:bg-primary-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => navigate("/cart")}
                    className="btn-primary flex-1 text-base py-4"
                  >
                    View Cart
                  </button>
                </div>
              )
            ) : (
              <button disabled className="w-full py-4 rounded-xl bg-gray-100 text-gray-400 font-semibold cursor-not-allowed">
                Out of Stock
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
