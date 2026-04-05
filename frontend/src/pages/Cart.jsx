import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";
import CartRecommendations from "../components/CartRecommendations";

const Cart = () => {
  const { user, products, cartItems, addToCart, removeFromCart, clearCart, cartTotal, BACKEND_URL, fetchProducts } = useApp();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [addressForm, setAddressForm] = useState({
    firstName: "", lastName: "", email: "", street: "",
    city: "", state: "", zipCode: "", country: "", phone: "",
  });

  const cartEntries = Object.entries(cartItems).filter(([, qty]) => qty > 0);
  const cartProducts = cartEntries
    .map(([id, qty]) => ({ product: products.find((p) => p._id === id), qty }))
    .filter((e) => e.product);

  useEffect(() => {
    if (!user) return;
    axios.get(`${BACKEND_URL}/api/address/get`).then(({ data }) => {
      if (data.success) setAddresses(data.addresses);
    });
  }, [user]);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/address/add`, addressForm);
      if (data.success) {
        setAddresses((prev) => [...prev, data.address]);
        setSelectedAddress(data.address._id);
        setShowAddressForm(false);
        toast.success("Address saved!");
        setAddressForm({ firstName: "", lastName: "", email: "", street: "", city: "", state: "", zipCode: "", country: "", phone: "" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save address");
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) { navigate("/login"); return; }
    if (!selectedAddress) { toast.error("Please select a delivery address"); return; }
    if (cartProducts.length === 0) { toast.error("Your cart is empty"); return; }
    setOrdering(true);
    try {
      const items = cartProducts.map(({ product, qty }) => ({ product: product._id, quantity: qty }));
      const { data } = await axios.post(`${BACKEND_URL}/api/order/cod`, {
        items, amount: cartTotal, address: selectedAddress,
      });
      if (data.success) {
        await clearCart();
        fetchProducts();
        toast.success("Order placed successfully! 🎉");
        navigate("/my-orders");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Order failed");
    } finally {
      setOrdering(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <span className="text-6xl">🔒</span>
          <h2 className="text-2xl font-bold text-gray-900 font-display">Login to view your cart</h2>
          <Link to="/login" className="btn-primary inline-flex">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="page-title mb-8">Your Cart</h1>

        {cartProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-24 h-24 bg-primary-50 rounded-3xl flex items-center justify-center">
              <span className="text-5xl">🛒</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 font-display">Your cart is empty</h2>
            <p className="text-gray-500">Add some fresh groceries to get started!</p>
            <Link to="/" className="btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items — card-list layout */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-gray-500 font-medium">{cartProducts.length} item{cartProducts.length !== 1 ? "s" : ""} in cart</p>
                <button
                  onClick={() => { if (window.confirm("Clear your entire cart?")) clearCart(); }}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium"
                >
                  Clear cart
                </button>
              </div>

              {/* Item cards */}
              <div className="space-y-3">
                {cartProducts.map(({ product, qty }) => {
                  const maxStock = typeof product.quantity === "number" ? product.quantity : null;
                  const atMax = maxStock !== null && qty >= maxStock;
                  const imageUrl =
                    product.image && product.image.length > 0
                      ? product.image[0].startsWith("http")
                        ? product.image[0]
                        : `${BACKEND_URL}${product.image[0]}`
                      : null;
                  const discount = product.price > 0
                    ? Math.round(((product.price - product.offerPrice) / product.price) * 100)
                    : 0;

                  return (
                    <div key={product._id} className="card p-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow">
                      {/* Image */}
                      <Link to={`/product/${product._id}`} className="flex-shrink-0">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
                          {imageUrl ? (
                            <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">🛒</div>
                          )}
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-0.5">{product.category}</p>
                        <Link to={`/product/${product._id}`}>
                          <p className="font-semibold text-gray-900 text-sm leading-snug hover:text-primary-600 transition-colors line-clamp-2">{product.name}</p>
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-bold text-gray-900">₹{product.offerPrice}</span>
                          {product.price > product.offerPrice && (
                            <span className="text-xs text-gray-400 line-through">₹{product.price}</span>
                          )}
                          {discount > 0 && (
                            <span className="badge-orange">{discount}% off</span>
                          )}
                        </div>
                      </div>

                      {/* Qty controls */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                          <button
                            id={`cart-dec-${product._id}`}
                            onClick={() => removeFromCart(product._id)}
                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold flex items-center justify-center hover:bg-gray-50 transition-colors"
                          >
                            −
                          </button>
                          <span className="text-sm font-bold text-gray-900 min-w-[1.5rem] text-center">{qty}</span>
                          <button
                            id={`cart-inc-${product._id}`}
                            type="button"
                            disabled={atMax}
                            onClick={() => addToCart(product._id)}
                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-bold text-gray-900">₹{(product.offerPrice * qty).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI Recommendations */}
              <CartRecommendations />
            </div>

            {/* Order Summary + Address — sticky on desktop */}
            <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              {/* Summary Card */}
              <div className="card p-6 space-y-4">
                <h2 className="section-title font-display">Order Summary</h2>
                <div className="space-y-2.5 text-sm">
                  {cartProducts.map(({ product, qty }) => (
                    <div key={product._id} className="flex justify-between text-gray-600 gap-2">
                      <span className="truncate flex-1">{product.name} <span className="text-gray-400">×{qty}</span></span>
                      <span className="font-medium flex-shrink-0">₹{product.offerPrice * qty}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-1">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Delivery</span>
                    <span>FREE</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
                    <span>Total</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Address Selection */}
              <div className="card p-6 space-y-4">
                <h2 className="section-title font-display">Delivery Address</h2>

                {addresses.length > 0 && (
                  <div className="space-y-2.5">
                    {addresses.map((addr) => (
                      <label
                        key={addr._id}
                        className={`flex gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          selectedAddress === addr._id
                            ? "border-primary-500 bg-primary-50 shadow-sm"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {/* Radio indicator */}
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                          selectedAddress === addr._id ? "border-primary-600" : "border-gray-300"
                        }`}>
                          {selectedAddress === addr._id && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary-600" />
                          )}
                        </div>
                        <input
                          type="radio"
                          name="address"
                          value={addr._id}
                          checked={selectedAddress === addr._id}
                          onChange={() => setSelectedAddress(addr._id)}
                          className="sr-only"
                        />
                        <div className="text-sm text-gray-700 min-w-0">
                          <p className="font-semibold text-gray-900">{addr.firstName} {addr.lastName}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{addr.street}, {addr.city}</p>
                          <p className="text-gray-500 text-xs">{addr.state} {addr.zipCode}, {addr.country}</p>
                          <p className="text-gray-500 text-xs">{addr.phone}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <button
                  id="add-address-btn"
                  onClick={() => setShowAddressForm(!showAddressForm)}
                  className="btn-secondary w-full text-sm"
                >
                  {showAddressForm ? "✕ Cancel" : "+ Add New Address"}
                </button>

                {showAddressForm && (
                  <form onSubmit={handleAddAddress} className="space-y-3 pt-2 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-3">
                      {["firstName", "lastName"].map((field) => (
                        <div key={field}>
                          <label className="label capitalize">{field.replace(/([A-Z])/g, " $1")}</label>
                          <input
                            required
                            className="input-field"
                            value={addressForm[field]}
                            onChange={(e) => setAddressForm({ ...addressForm, [field]: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                    {["email", "phone", "street", "city", "state", "zipCode", "country"].map((field) => (
                      <div key={field}>
                        <label className="label capitalize">{field.replace(/([A-Z])/g, " $1")}</label>
                        <input
                          required
                          className="input-field"
                          value={addressForm[field]}
                          onChange={(e) => setAddressForm({ ...addressForm, [field]: e.target.value })}
                        />
                      </div>
                    ))}
                    <button type="submit" className="btn-primary w-full">Save Address</button>
                  </form>
                )}
              </div>

              {/* Place Order */}
              <button
                id="place-order-btn"
                onClick={handlePlaceOrder}
                disabled={ordering || cartProducts.length === 0 || !selectedAddress}
                className="btn-primary w-full py-4 text-base"
              >
                {ordering ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Placing Order…
                  </span>
                ) : "Place Order (COD)"}
              </button>

              {!selectedAddress && cartProducts.length > 0 && (
                <p className="text-xs text-center text-amber-600 font-medium">
                  ⚠️ Please select a delivery address
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
