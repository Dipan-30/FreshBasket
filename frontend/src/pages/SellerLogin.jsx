import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";

const SellerLogin = () => {
  const { setIsSeller, setUser, setCartItems, BACKEND_URL } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/seller/login`, form);
      if (data.success) {
        setUser(null);
        setCartItems({});
        setIsSeller(true);
        toast.success("Seller logged in!");
        navigate("/seller");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid seller credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg mb-3">
              <span className="text-2xl">🏪</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Seller Portal</h1>
            <p className="text-gray-400 text-sm mt-1">Manage your grocery store</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                id="seller-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@example.com"
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                id="seller-password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-gray-500"
              />
            </div>
            <button
              id="seller-login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-bold text-sm hover:from-yellow-500 hover:to-orange-600 transition-all duration-200 mt-2 disabled:opacity-50"
            >
              {loading ? "Logging in…" : "Login as Seller"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SellerLogin;
