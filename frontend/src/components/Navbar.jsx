import React, { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";

const CATEGORY_SHORTCUTS = [
  { label: "🥛 Dairy", value: "Dairy" },
  { label: "🍞 Bakery", value: "Bakery" },
  { label: "🍎 Fruits", value: "Fruits" },
  { label: "🥦 Vegetables", value: "Vegetables" },
  { label: "🍿 Snacks", value: "Snacks" },
  { label: "☕ Beverages", value: "Beverages" },
  { label: "🥣 Breakfast", value: "Breakfast" },
  { label: "🥚 Protein", value: "Protein" },
  { label: "🌶️ Spices", value: "Spices" },
];

const Navbar = () => {
  const { user, setUser, isSeller, setIsSeller, cartCount, wishlistCount, BACKEND_URL } = useApp();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [cartPopped, setCartPopped] = useState(false);
  const avatarRef = useRef(null);
  const prevCartCount = useRef(cartCount);

  // Cart badge scale-pop on count change
  useEffect(() => {
    if (cartCount !== prevCartCount.current) {
      setCartPopped(true);
      const t = setTimeout(() => setCartPopped(false), 300);
      prevCartCount.current = cartCount;
      return () => clearTimeout(t);
    }
  }, [cartCount]);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    try {
      await axios.get(`${BACKEND_URL}/api/user/logout`);
      setUser(null);
      setAvatarOpen(false);
      setMobileOpen(false);
      toast.success("Logged out successfully");
      navigate("/");
    } catch {
      toast.error("Logout failed");
    }
  };

  const handleSellerLogout = async () => {
    try {
      await axios.get(`${BACKEND_URL}/api/seller/logout`);
      setIsSeller(false);
      setMobileOpen(false);
      toast.success("Seller logged out");
      navigate("/");
    } catch {
      toast.error("Logout failed");
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        {/* Main nav bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Hamburger — mobile only */}
            <button
              id="mobile-menu-btn"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-primary-700 transition-colors group-hover:shadow-glow-green">
                <span className="text-white text-base">🛒</span>
              </div>
              <span className="text-xl font-bold text-gray-900 font-display">
                Fresh<span className="text-primary-600">Basket</span>
              </span>
            </Link>

            {/* Desktop Nav links */}
            <div className="hidden md:flex items-center gap-6">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${isActive ? "text-primary-600" : "text-gray-600 hover:text-gray-900"}`
                }
              >
                Shop
              </NavLink>
              {!isSeller && (
                <NavLink
                  to="/wishlist"
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${isActive ? "text-primary-600" : "text-gray-600 hover:text-gray-900"}`
                  }
                >
                  Wishlist
                </NavLink>
              )}
              {user && (
                <NavLink
                  to="/my-orders"
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${isActive ? "text-primary-600" : "text-gray-600 hover:text-gray-900"}`
                  }
                >
                  My Orders
                </NavLink>
              )}
              {isSeller && (
                <NavLink
                  to="/seller"
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${isActive ? "text-primary-600" : "text-gray-600 hover:text-gray-900"}`
                  }
                >
                  Seller Dashboard
                </NavLink>
              )}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              {!isSeller && (
                <Link
                  to="/wishlist"
                  id="wishlist-btn"
                  className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  aria-label="Wishlist"
                >
                  <svg
                    className="w-6 h-6 text-gray-700"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center">
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart */}
              <Link
                to="/cart"
                id="cart-btn"
                className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-9H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transition-transform ${cartPopped ? "animate-scale-pop" : ""}`}
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              {/* Auth — Avatar dropdown or Login button */}
              {user ? (
                <div className="relative" ref={avatarRef}>
                  <button
                    id="avatar-btn"
                    onClick={() => setAvatarOpen((o) => !o)}
                    className="w-9 h-9 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center hover:bg-primary-700 transition-colors shadow-sm"
                    title={user.name}
                    aria-label="Account menu"
                    aria-expanded={avatarOpen}
                  >
                    {initials}
                  </button>

                  {/* Dropdown */}
                  {avatarOpen && (
                    <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                      <div className="px-4 py-2 border-b border-gray-100 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                      {!isSeller && (
                        <Link
                          to="/wishlist"
                          onClick={() => setAvatarOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg
                            className="w-4 h-4 text-gray-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                          </svg>
                          Wishlist
                        </Link>
                      )}
                      <Link
                        to="/my-orders"
                        onClick={() => setAvatarOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        My Orders
                      </Link>
                      <button
                        id="logout-btn"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" id="login-nav-btn" className="btn-primary text-sm py-2 px-4">
                  Login
                </Link>
              )}

              {/* Seller pill */}
              {!isSeller ? (
                <Link
                  to="/seller-login"
                  className="hidden sm:block text-xs text-gray-500 hover:text-primary-600 transition-colors font-medium border border-gray-200 rounded-lg px-3 py-1.5 hover:border-primary-200"
                >
                  Seller
                </Link>
              ) : (
                <button
                  onClick={handleSellerLogout}
                  className="hidden sm:block text-xs text-red-500 hover:text-red-600 font-medium border border-red-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-red-50"
                >
                  Exit Seller
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category shortcuts bar — desktop only */}
        <div className="hidden md:block border-t border-gray-100 bg-gray-50/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide py-1.5">
              {CATEGORY_SHORTCUTS.map((cat) => (
                <Link
                  key={cat.value}
                  to={`/?category=${cat.value}`}
                  className="whitespace-nowrap flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium text-gray-600 hover:bg-primary-100 hover:text-primary-700 transition-all duration-150"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer backdrop ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer slide-in panel ──────────────────────────────────── */}
      <div
        id="mobile-drawer"
        className={`fixed top-0 left-0 h-full w-72 z-50 bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <Link to="/" onClick={closeMobile} className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🛒</span>
            </div>
            <span className="text-lg font-bold font-display text-gray-900">
              Fresh<span className="text-primary-600">Basket</span>
            </span>
          </Link>
          <button
            onClick={closeMobile}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User info in drawer */}
        {user && (
          <div className="px-5 py-4 bg-primary-50 border-b border-primary-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center text-sm">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Drawer nav links */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <Link onClick={closeMobile} to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 font-medium transition-colors">
            <span>🏠</span> Shop
          </Link>
          {!isSeller && (
            <Link onClick={closeMobile} to="/wishlist" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 font-medium transition-colors">
              <span>❤️</span> Wishlist
              {wishlistCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </Link>
          )}
          {user && (
            <Link onClick={closeMobile} to="/my-orders" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 font-medium transition-colors">
              <span>📦</span> My Orders
            </Link>
          )}
          <Link onClick={closeMobile} to="/cart" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 font-medium transition-colors">
            <span>🛒</span> Cart {cartCount > 0 && <span className="ml-auto bg-primary-600 text-white text-xs rounded-full px-2 py-0.5">{cartCount}</span>}
          </Link>
          {isSeller && (
            <Link onClick={closeMobile} to="/seller" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 font-medium transition-colors">
              <span>🏪</span> Seller Dashboard
            </Link>
          )}

          {/* Category pills in drawer */}
          <div className="pt-3 pb-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Categories</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_SHORTCUTS.map((cat) => (
                <Link
                  key={cat.value}
                  to={`/?category=${cat.value}`}
                  onClick={closeMobile}
                  className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-primary-100 hover:text-primary-700 transition-colors"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Drawer footer actions */}
        <div className="px-4 py-4 border-t border-gray-100 space-y-2">
          {user ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 font-medium text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          ) : (
            <Link to="/login" onClick={closeMobile} className="btn-primary w-full text-sm">
              Login
            </Link>
          )}
          {!isSeller && (
            <Link
              to="/seller-login"
              onClick={closeMobile}
              className="block text-center text-xs text-gray-500 hover:text-primary-600 transition-colors py-1"
            >
              Are you a seller? →
            </Link>
          )}
        </div>
      </div>
    </>
  );
};

export default Navbar;
