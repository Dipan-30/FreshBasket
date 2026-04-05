import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";

const CATEGORIES = [
  { label: "All",         emoji: "🛒" },
  { label: "Dairy",       emoji: "🥛" },
  { label: "Bakery",      emoji: "🍞" },
  { label: "Fruits",      emoji: "🍎" },
  { label: "Vegetables",  emoji: "🥦" },
  { label: "Snacks",      emoji: "🍿" },
  { label: "Beverages",   emoji: "☕" },
  { label: "Breakfast",   emoji: "🥣" },
  { label: "Protein",     emoji: "🥚" },
  { label: "Spices",      emoji: "🌶️" },
];

const PAGE_SIZE = 20;

const Home = () => {
  const { products, loading, productError, fetchProducts } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  // Input value updates instantly (no delay)
  const [inputValue, setInputValue] = useState("");
  // Debounced search (300ms) — actually filters products
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "All"
  );
  const [page, setPage] = useState(1);

  // Sync category from URL (from Navbar shortcuts)
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setSelectedCategory(cat);
  }, [searchParams]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearch(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, selectedCategory]);

  const handleCategorySelect = useCallback((cat) => {
    setSelectedCategory(cat);
    if (cat !== "All") {
      setSearchParams({ category: cat });
    } else {
      setSearchParams({});
    }
  }, [setSearchParams]);

  // Filter products
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  // Hot deals: products with > 10% discount, sorted by discount desc
  const hotDeals = useMemo(() => {
    return products
      .filter((p) => p.price > 0 && (p.price - p.offerPrice) / p.price > 0.10 && p.inStock)
      .sort((a, b) => (b.price - b.offerPrice) / b.price - (a.price - a.offerPrice) / a.price)
      .slice(0, 12);
  }, [products]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const skeletonCount = 10;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-emerald-700 text-white overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary-900/30 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left — headline + CTA */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 mb-3 lg:mb-4">
                <span className="text-[10px] sm:text-xs font-medium text-primary-100">✨ Powered by AI</span>
              </div>
              <h1 className="hero-title text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white mb-3 lg:mb-5 leading-tight">
                Fresh Groceries,{" "}
                <span className="text-yellow-300 relative inline-block">
                  Delivered
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none">
                    <path d="M0 6 Q100 0 200 6" stroke="rgba(253,224,71,0.7)" strokeWidth="2" fill="none" />
                  </svg>
                </span>{" "}
                Smart
              </h1>
              <p className="text-primary-100 text-sm sm:text-lg mb-5 lg:mb-8 max-w-md mx-auto lg:mx-0">
                Shop from our curated selection and get AI-powered recommendations tailored to your cart.
              </p>

              {/* Search bar */}
              <div className="max-w-lg mx-auto lg:mx-0 relative">
                <input
                  id="product-search"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Search for fruits, milk, bread…"
                  className="w-full rounded-xl lg:rounded-2xl py-3 lg:py-4 pl-5 lg:pl-6 pr-12 lg:pr-14 text-gray-900 text-sm shadow-xl focus:outline-none focus:ring-2 focus:ring-yellow-300 font-body"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {inputValue ? (
                    <button
                      onClick={() => setInputValue("")}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Clear search"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:gap-3 mt-4 lg:mt-5 justify-center lg:justify-start flex-row text-xs sm:text-sm text-primary-100">
                <span>🛡️ Secure checkout</span>
                <span className="hidden sm:inline">•</span>
                <span>⚡ Fast delivery</span>
                <span className="hidden sm:inline">•</span>
                <span>✨ AI picks</span>
              </div>
            </div>

            {/* Right — floating product illustration */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-72 h-72">
                {/* Main floating emoji */}
                <div className="absolute inset-0 flex items-center justify-center animate-float">
                  <div className="w-48 h-48 bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 flex items-center justify-center shadow-2xl">
                    <span className="text-8xl">🛒</span>
                  </div>
                </div>
                {/* Orbiting product emojis */}
                {[
                  { emoji: "🍎", top: "0%", left: "50%", delay: "0s" },
                  { emoji: "🥦", top: "50%", right: "0", delay: "0.5s" },
                  { emoji: "🥛", bottom: "0", left: "50%", delay: "1s" },
                  { emoji: "🍞", top: "50%", left: "0", delay: "1.5s" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="absolute w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-2xl border border-white/30 animate-float"
                    style={{
                      top: item.top,
                      left: item.left,
                      right: item.right,
                      bottom: item.bottom,
                      transform: "translate(-50%, -50%)",
                      animationDelay: item.delay,
                    }}
                  >
                    {item.emoji}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Hot Deals row */}
        {!loading && hotDeals.length > 0 && !search && selectedCategory === "All" && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-accent-500 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white text-sm">🔥</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 font-display">Hot Deals</h2>
              <span className="badge-orange">Up to {Math.max(...hotDeals.map(p => Math.round(((p.price - p.offerPrice) / p.price) * 100)))}% off</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1">
              {hotDeals.map((product) => (
                <div key={product._id} className="flex-shrink-0 w-48">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              id={`category-${cat.label.toLowerCase()}`}
              onClick={() => handleCategorySelect(cat.label)}
              className={`whitespace-nowrap flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                selectedCategory === cat.label
                  ? "bg-primary-600 text-white shadow-md"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-primary-200 hover:text-primary-600 hover:bg-primary-50"
              }`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {productError && (
          <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-red-800">Failed to load products.</p>
              <p>{productError}</p>
            </div>
            <button
              onClick={fetchProducts}
              className="btn-secondary px-4 py-2 text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title font-display">
            {search ? `Results for "${search}"` : selectedCategory === "All" ? "All Products" : selectedCategory}
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({filtered.length} {filtered.length === 1 ? "item" : "items"})
            </span>
          </h2>
          {search && (
            <button
              onClick={() => { setInputValue(""); setSelectedCategory("All"); }}
              className="text-sm text-primary-600 hover:underline font-medium"
            >
              Clear
            </button>
          )}
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(skeletonCount)].map((_, i) => (
              <div key={i} className="card p-4 space-y-3">
                <div className="skeleton h-48 w-full" />
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-10 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {!loading && paginated.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {paginated.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary py-2 px-4 text-sm disabled:opacity-40"
                >
                  ← Prev
                </button>
                <div className="flex gap-1">
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${
                          page === pageNum
                            ? "bg-primary-600 text-white shadow-md"
                            : "bg-white text-gray-600 border border-gray-200 hover:border-primary-200"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && (
                    <span className="px-2 py-1 text-gray-400 text-sm self-center">…{totalPages}</span>
                  )}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary py-2 px-4 text-sm disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <span className="text-6xl">{productError ? "⚠️" : "🔍"}</span>
            <h3 className="text-xl font-semibold text-gray-700 font-display">
              {productError ? "Unable to load products" : "No products found"}
            </h3>
            <p className="text-gray-500 text-sm">
              {productError
                ? "There was a problem loading the catalog. Please retry or check your backend."
                : "Try a different search term or category"}
            </p>
            <button
              onClick={() => {
                if (productError) {
                  fetchProducts();
                } else {
                  setInputValue("");
                  setSelectedCategory("All");
                  setSearchParams({});
                }
              }}
              className="btn-primary"
            >
              {productError ? "Retry" : "Clear Filters"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
