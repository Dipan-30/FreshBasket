import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { fetchCartRecommendations } from "../services/recommendationApi";

const AppContext = createContext();

axios.defaults.withCredentials = true;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// ─── Cart localStorage helpers ────────────────────────────────────────────────
// Cart is ONLY stored in DB for logged-in users.
// localStorage acts as a write-through cache so the UI survives a hard refresh
// without an extra round-trip, but the DB is always the source of truth.

const CART_STORAGE_KEY = "freshbasket_cart";

function writeCartToStorage(cartItems) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  } catch {
    /* ignore quota / private mode */
  }
}

function readCartFromStorage() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || Array.isArray(parsed)) return {};
    // Strip any zero-qty entries that may have leaked in
    return Object.fromEntries(
      Object.entries(parsed).filter(([, qty]) => typeof qty === "number" && qty > 0)
    );
  } catch {
    return {};
  }
}

function clearCartFromStorage() {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isSeller, setIsSeller] = useState(false);
  const [products, setProducts] = useState([]);

  // Initialise from localStorage so the cart renders immediately on refresh,
  // then the DB value overwrites it once fetchUser() completes.
  const [cartItems, setCartItems] = useState(readCartFromStorage);

  // ── Wishlist — DB-backed for authenticated users, empty for guests ────────
  const [wishlistIds, setWishlistIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [productError, setProductError] = useState("");

  // Recommendations state
  const [recommendations, setRecommendations] = useState([]);
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");

  // Keep a ref of the current cart so async callbacks always see the latest value
  const cartItemsRef = useRef(cartItems);
  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const fetchUser = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/user/is-auth`);
      if (data.success) {
        setUser(data.user);
        // DB is source of truth — overwrite localStorage cache
        const dbCart = data.user.cartItems || {};
        setCartItems(dbCart);
        writeCartToStorage(dbCart);
      }
    } catch {
      setUser(null);
      // Guest: clear any stale cart that may belong to a previous session
      clearCartFromStorage();
      setCartItems({});
    }
  }, []);

  const fetchSeller = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/seller/is-auth`);
      if (data.success) setIsSeller(true);
    } catch {
      setIsSeller(false);
    }
  }, []);

  // ─── Wishlist — DB operations ─────────────────────────────────────────────

  /**
   * Load the authenticated user's wishlist from the DB.
   * Called once on login / init. Guests get an empty array.
   */
  const fetchWishlist = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/wishlist`);
      if (data.success) {
        setWishlistIds(data.products.map((p) => String(p._id)));
      }
    } catch {
      setWishlistIds([]);
    }
  }, []);

  /**
   * Toggle a product in/out of the DB wishlist.
   * Optimistic update: update local state immediately, revert on failure.
   */
  const toggleWishlist = useCallback(
    async (productId) => {
      if (!user) {
        toast.error("Please log in to save items to your wishlist.");
        return;
      }

      const previous = wishlistIds;
      const isCurrentlyIn = previous.includes(productId);

      // Optimistic update
      setWishlistIds(isCurrentlyIn
        ? previous.filter((id) => id !== productId)
        : [...previous, productId]
      );

      try {
        const { data } = await axios.post(`${BACKEND_URL}/api/wishlist/toggle`, { productId });
        if (data.success) {
          // Sync with the authoritative list the server returned
          setWishlistIds(data.wishlistIds || []);
        } else {
          setWishlistIds(previous); // revert
        }
      } catch {
        setWishlistIds(previous); // revert
        toast.error("Failed to update wishlist. Please try again.");
      }
    },
    [user, wishlistIds]
  );

  const isWishlisted = useCallback(
    (productId) => wishlistIds.includes(productId),
    [wishlistIds]
  );

  const wishlistCount = wishlistIds.length;

  // ─── Products ─────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setProductError("");
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/product/list`);
      if (data.success) {
        setProducts(data.products);
      } else {
        setProductError(data.message || "Failed to load products.");
        setProducts([]);
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to load products.";
      setProductError(message);
      setProducts([]);
    }
  }, []);

  // ─── Cart ─────────────────────────────────────────────────────────────────

  /**
   * Persist cart to DB and localStorage together.
   * Always called after any mutation to keep the three sources in sync.
   *
   * FIX: items with qty === 0 are passed as 0 to the backend so the controller
   * can $unset them, AND they are stripped from localStorage immediately.
   */
  const persistCart = useCallback(
    async (newCart) => {
      // Write to localStorage immediately (strips zeros automatically)
      const storageCart = Object.fromEntries(
        Object.entries(newCart).filter(([, qty]) => qty > 0)
      );
      writeCartToStorage(storageCart);

      if (user) {
        try {
          await axios.post(`${BACKEND_URL}/api/cart/update`, { cartItems: newCart });
        } catch (err) {
          console.error("persistCart DB sync error:", err.message);
          throw err; // let callers handle the revert
        }
      }
    },
    [user]
  );

  const addToCart = useCallback(
    async (productId, options = {}) => {
      const product = products.find((p) => p._id === productId);
      const maxStock =
        typeof options.maxQuantity === "number"
          ? options.maxQuantity
          : typeof product?.quantity === "number"
          ? product.quantity
          : null;

      const current = cartItemsRef.current[productId] || 0;
      if (maxStock !== null && current >= maxStock) {
        toast.error("No more of this item is available.");
        return;
      }

      const previous = cartItemsRef.current;
      const updated = { ...previous, [productId]: current + 1 };

      // Optimistic update
      setCartItems(updated);

      try {
        await persistCart(updated);
        toast.success("Added to cart!");
      } catch {
        setCartItems(previous);
        writeCartToStorage(previous);
        toast.error("Failed to update cart. Please try again.");
      }
    },
    [products, persistCart]
  );

  const removeFromCart = useCallback(
    async (productId) => {
      const previous = cartItemsRef.current;
      const updated = { ...previous };

      if ((updated[productId] || 0) > 1) {
        updated[productId] -= 1;
      } else {
        // Set to 0 so persistCart sends it to the backend for $unset
        updated[productId] = 0;
      }

      // Optimistic update — strip zeros for UI state
      const uiCart = Object.fromEntries(
        Object.entries(updated).filter(([, qty]) => qty > 0)
      );
      setCartItems(uiCart);

      try {
        // Send full updated (with the 0) so backend can $unset the key
        await persistCart(updated);
      } catch {
        setCartItems(previous);
        writeCartToStorage(previous);
        toast.error("Failed to update cart. Please try again.");
      }
    },
    [persistCart]
  );

  const clearCart = useCallback(async () => {
    const previous = cartItemsRef.current;
    setCartItems({});
    clearCartFromStorage();

    if (user) {
      try {
        await axios.post(`${BACKEND_URL}/api/cart/clear`);
      } catch (err) {
        setCartItems(previous);
        writeCartToStorage(previous);
        console.error("clearCart sync error:", err.message);
      }
    }
  }, [user]);

  const cartCount = Object.values(cartItems).reduce((a, b) => a + b, 0);

  const cartTotal = Object.entries(cartItems).reduce((total, [id, qty]) => {
    const p = products.find((p) => p._id === id);
    return total + (p ? p.offerPrice * qty : 0);
  }, 0);

  // ─── Recommendations ───────────────────────────────────────────────────────
  const fetchRecommendations = useCallback(async () => {
    if (!user) return;
    if (Object.keys(cartItems).filter((id) => cartItems[id] > 0).length === 0) {
      setRecommendations([]);
      return;
    }
    setIsRecommendationLoading(true);
    setRecommendationError("");
    try {
      const recs = await fetchCartRecommendations();
      setRecommendations(recs || []);
    } catch (err) {
      console.error("fetchRecommendations error:", err.message);
      setRecommendationError("Could not load recommendations. Please try again.");
    } finally {
      setIsRecommendationLoading(false);
    }
  }, [user, cartItems]);

  // ─── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchUser(), fetchSeller(), fetchProducts()]);
      setLoading(false);
    };
    init();
  }, [fetchUser, fetchSeller, fetchProducts]);

  // Fetch wishlist once user is known
  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else {
      // Guest: no wishlist shown
      setWishlistIds([]);
    }
  }, [user, fetchWishlist]);

  // Fetch recommendations when cart changes and user is logged in
  useEffect(() => {
    if (user && Object.keys(cartItems).length > 0) {
      fetchRecommendations();
    }
  }, [cartItems, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drop shopper-specific data when user session ends
  useEffect(() => {
    if (!user) {
      setRecommendations([]);
      setRecommendationError("");
    }
  }, [user]);

  const value = {
    BACKEND_URL,
    user,
    setUser,
    isSeller,
    setIsSeller,
    products,
    fetchProducts,
    productError,
    cartItems,
    setCartItems,
    addToCart,
    removeFromCart,
    clearCart,
    cartCount,
    cartTotal,
    wishlistIds,
    toggleWishlist,
    isWishlisted,
    wishlistCount,
    loading,
    recommendations,
    isRecommendationLoading,
    recommendationError,
    fetchRecommendations,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
};
