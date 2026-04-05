import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { deliverOrder } from "../services/orderApi";
import SellerReviews from "./SellerReviews";

const SellerDashboard = () => {
  const { isSeller, BACKEND_URL, fetchProducts, products } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", description: "", price: "", offerPrice: "", category: "", quantity: "",
  });
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState([]);
  const [adding, setAdding] = useState(false);
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState("products"); // 'products' | 'add' | 'orders' | 'reviews'
  const [quantityUpdatingId, setQuantityUpdatingId] = useState(null);
  const [deliveringId, setDeliveringId] = useState(null);

  useEffect(() => {
    if (!isSeller) navigate("/seller-login");
  }, [isSeller]);

  useEffect(() => {
    if (view === "orders") {
      axios.get(`${BACKEND_URL}/api/order/seller`).then(({ data }) => {
        if (data.success) setOrders(data.orders);
      });
    }
  }, [view, BACKEND_URL]);

  const markDelivered = async (orderId) => {
    setDeliveringId(orderId);
    try {
      const data = await deliverOrder(orderId);
      if (data.success) {
        toast.success("Order marked as delivered");
        setOrders((prev) => prev.map((o) => (o._id === orderId ? data.order : o)));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update delivery status");
    } finally {
      setDeliveringId(null);
    }
  };

  const handleFileChange = (e) => {
    const selected = [...e.target.files];
    setFiles(selected);
    setPreview(selected.map((f) => URL.createObjectURL(f)));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (files.length === 0) { toast.error("Please add at least one image"); return; }
    setAdding(true);
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => formData.append(k, v));
    files.forEach((f) => formData.append("images", f));
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/product/add-product`, formData);
      if (data.success) {
        toast.success("Product added!");
        setForm({ name: "", description: "", price: "", offerPrice: "", category: "", quantity: "" });
        setFiles([]);
        setPreview([]);
        fetchProducts();
        setView("products");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add product");
    } finally {
      setAdding(false);
    }
  };

  const toggleStock = async (id, current) => {
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/product/stock`, { id, inStock: !current });
      if (data.success) {
        fetchProducts();
        toast.success(`Stock updated`);
      }
    } catch {
      toast.error("Failed to update stock");
    }
  };

  const adjustStock = async (productId, payload) => {
    setQuantityUpdatingId(productId);
    try {
      const { data } = await axios.patch(
        `${BACKEND_URL}/api/product/quantity`,
        { id: productId, ...payload },
        { withCredentials: true }
      );
      if (data.success) {
        fetchProducts();
        const q = data.product?.quantity;
        if (payload.add != null) {
          toast.success(`Added ${payload.add}${typeof q === "number" ? ` · ${q} in stock` : ""}`);
        } else {
          toast.success(`Reduced by ${payload.subtract}${typeof q === "number" ? ` · ${q} in stock` : ""}`);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update quantity");
    } finally {
      setQuantityUpdatingId(null);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const { data } = await axios.delete(`${BACKEND_URL}/api/product/${id}`, { withCredentials: true });
      if (data.success) {
        toast.success("Product deleted successfully");
        fetchProducts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete product");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="page-title">Seller Dashboard</h1>
          <div className="flex flex-wrap gap-2 justify-end">
            {["products", "add", "orders", "reviews"].map((v) => (
              <button
                key={v}
                id={`seller-tab-${v}`}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                  view === v ? "bg-primary-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:border-primary-200"
                }`}
              >
                {v === "add" ? "Add Product" : v === "orders" ? "All Orders" : v === "reviews" ? "Reviews" : "Products"}
              </button>
            ))}
          </div>
        </div>

        {/* Products List */}
        {view === "products" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{products.length} products in store</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => {
                const currentQty = typeof p.quantity === "number" ? p.quantity : 0;
                const imageUrl =
                  p.image && p.image.length > 0
                    ? p.image[0].startsWith("http")
                      ? p.image[0]
                      : `${BACKEND_URL}${p.image[0]}`
                    : null;
                return (
                  <div key={p._id} className="card p-4 flex gap-4 items-start">
                    <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                      {imageUrl ? (
                        <img src={imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🛒</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 mb-1">
                        {p.category} · ₹{p.offerPrice}
                        <span className="text-gray-600"> · Qty: {typeof p.quantity === "number" ? p.quantity : "—"}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mr-0.5">Restock</span>
                        {[1, 5, 10].map((n) => (
                          <button
                            key={n}
                            type="button"
                            id={`add-stock-${p._id}-${n}`}
                            disabled={quantityUpdatingId === p._id}
                            onClick={() => adjustStock(p._id, { add: n })}
                            className="text-xs font-medium px-2 py-1 rounded-lg bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            +{n}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mr-0.5">Reduce</span>
                        {[1, 5, 10].map((n) => (
                          <button
                            key={n}
                            type="button"
                            id={`sub-stock-${p._id}-${n}`}
                            disabled={quantityUpdatingId === p._id || currentQty === 0}
                            onClick={() => adjustStock(p._id, { subtract: n })}
                            className="text-xs font-medium px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            −{n}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          id={`toggle-stock-${p._id}`}
                          onClick={() => toggleStock(p._id, p.inStock)}
                          className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                            p.inStock
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-600 hover:bg-red-200"
                          }`}
                        >
                          {p.inStock ? "In Stock" : "Out of Stock"}
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p._id)}
                          className="text-xs font-medium px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                          title="Delete product"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Product Form */}
        {view === "add" && (
          <div className="max-w-2xl mx-auto">
            <div className="card p-8">
              <h2 className="section-title mb-6">Add New Product</h2>
              <form onSubmit={handleAddProduct} className="space-y-5">
                <div>
                  <label className="label">Product Name</label>
                  <input required className="input-field" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Organic Whole Milk" />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea required rows={3} className="input-field resize-none" value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe the product…" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">MRP (₹)</label>
                    <input required type="number" min="0" className="input-field" value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="100" />
                  </div>
                  <div>
                    <label className="label">Offer Price (₹)</label>
                    <input required type="number" min="0" className="input-field" value={form.offerPrice}
                      onChange={(e) => setForm({ ...form, offerPrice: e.target.value })} placeholder="80" />
                  </div>
                </div>
                <div>
                  <label className="label">Quantity in stock</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    className="input-field"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="e.g. 25"
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select required className="input-field" value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="">Select a category</option>
                    {["Dairy", "Bakery", "Fruits", "Vegetables", "Snacks", "Beverages", "Breakfast", "Protein", "Spices", "Other"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Product Images</label>
                  <label htmlFor="product-images" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-300 hover:bg-primary-50 transition-all">
                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-500">Click to upload images</span>
                    <input id="product-images" type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                  {preview.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {preview.map((url, i) => (
                        <img key={i} src={url} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                      ))}
                    </div>
                  )}
                </div>

                <button id="submit-product-btn" type="submit" disabled={adding} className="btn-primary w-full text-base py-4">
                  {adding ? "Adding Product…" : "Add Product"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* All Orders */}
        {view === "orders" && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-16 text-gray-500">No orders yet</div>
            ) : (
              orders.map((order) => {
                const isDelivered = order.status === "delivered" || order.status === "Delivered";
                const isPlaced =
                  order.status === "placed" ||
                  ["Order Placed", "Processing", "Shipped"].includes(order.status);
                const statusLabel = isDelivered ? "Delivered" : "Placed";
                const statusClass = isDelivered
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200";

                return (
                  <div key={order._id} className="card p-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {order.userId?.name || "Customer"}
                          <span className="text-xs font-normal text-gray-400 ml-2">({order.userId?.email})</span>
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          #{order._id.slice(-8).toUpperCase()} · {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-bold text-gray-900">₹{order.amount.toFixed(2)}</p>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {order.items.map((item, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">
                          {item.product?.name || "Product"} ×{item.quantity}
                        </span>
                      ))}
                    </div>
                    {isPlaced && (
                      <div className="pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          id={`mark-delivered-${order._id}`}
                          disabled={deliveringId === order._id}
                          onClick={() => markDelivered(order._id)}
                          className="text-sm font-semibold bg-primary-600 text-white px-4 py-2 rounded-xl hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        >
                          {deliveringId === order._id ? "Updating…" : "Mark as delivered"}
                        </button>
                      </div>
                    )}
                    {isDelivered && order.review?.rating != null && (
                      <div className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                        <span className="font-semibold text-gray-800">Customer review:</span>{" "}
                        {order.review.rating}★
                        {order.review.comment ? ` — “${order.review.comment.slice(0, 120)}${order.review.comment.length > 120 ? "…" : ""}”` : ""}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {view === "reviews" && <SellerReviews embedded />}
      </div>
    </div>
  );
};

export default SellerDashboard;
