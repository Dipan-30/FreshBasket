import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";
import {
  validateRegister,
  validateLogin,
  getPasswordStrength,
  PASSWORD_RULES,
  isValidEmailFormat,
} from "../utils/authValidation";

const strengthStyles = {
  weak: { label: "Weak", bar: "w-1/3 bg-red-400", text: "text-red-600" },
  medium: { label: "Medium", bar: "w-2/3 bg-amber-400", text: "text-amber-700" },
  strong: { label: "Strong", bar: "w-full bg-emerald-500", text: "text-emerald-700" },
};

function mapApiFieldErrors(errors) {
  if (!Array.isArray(errors)) return {};
  return errors.reduce((acc, cur) => {
    if (cur.field) acc[cur.field] = cur.message;
    return acc;
  }, {});
}

const Login = () => {
  const { setUser, setCartItems, setIsSeller, BACKEND_URL } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);

  const clientValidation = useMemo(() => {
    return mode === "login" ? validateLogin(form) : validateRegister(form);
  }, [mode, form]);

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const clearFieldError = useCallback((name) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    clearFieldError(name);
    setTouched((t) => ({ ...t, [name]: true }));
  };

  const handleBlur = (name) => {
    setTouched((t) => ({ ...t, [name]: true }));
  };

  useEffect(() => {
    if (mode !== "register") {
      setEmailAvailable(null);
      setEmailCheckLoading(false);
      return;
    }
    const email = form.email.trim();
    if (!isValidEmailFormat(email)) {
      setEmailAvailable(null);
      setEmailCheckLoading(false);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();
    const timer = setTimeout(() => {
      setEmailCheckLoading(true);
      axios
        .get(`${BACKEND_URL}/api/user/check-email`, {
          params: { email },
          signal: ac.signal,
        })
        .then(({ data }) => {
          if (!cancelled && data.success) setEmailAvailable(data.available);
        })
        .catch((err) => {
          if (cancelled || err.code === "ERR_CANCELED" || err.name === "CanceledError") return;
          setEmailAvailable(null);
        })
        .finally(() => {
          if (!cancelled) setEmailCheckLoading(false);
        });
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      ac.abort();
    };
  }, [form.email, mode, BACKEND_URL]);

  useEffect(() => {
    setFieldErrors({});
    setTouched({});
    setEmailAvailable(null);
    setShowPassword(false);
  }, [mode]);

  const registerBlockedByEmail = mode === "register" && emailAvailable === false;
  const submitDisabled =
    loading ||
    !clientValidation.valid ||
    registerBlockedByEmail ||
    (mode === "register" && emailCheckLoading && isValidEmailFormat(form.email.trim()));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });

    const local = mode === "login" ? validateLogin(form) : validateRegister(form);
    if (!local.valid) {
      setFieldErrors(local.errors);
      toast.error("Please fix the errors below.");
      return;
    }
    if (mode === "register" && emailAvailable === false) {
      toast.error("This email is already registered.");
      return;
    }

    setLoading(true);
    setFieldErrors({});
    try {
      const url =
        mode === "login"
          ? `${BACKEND_URL}/api/user/login`
          : `${BACKEND_URL}/api/user/register`;
      const payload =
        mode === "login"
          ? { email: form.email.trim(), password: form.password }
          : {
              name: form.name.trim(),
              email: form.email.trim(),
              password: form.password,
            };

      const { data } = await axios.post(url, payload);

      if (data.success) {
        setIsSeller(false);
        setUser(data.user);
        setCartItems(data.user?.cartItems || {});
        toast.success(mode === "login" ? "Welcome back!" : "Account created!");
        navigate("/");
      }
    } catch (err) {
      const body = err.response?.data;
      if (body?.errors?.length) {
        setFieldErrors((prev) => ({ ...prev, ...mapApiFieldErrors(body.errors) }));
        toast.error(body.message || "Validation error");
      } else {
        toast.error(body?.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const err = (name) => fieldErrors[name] || (touched[name] && clientValidation.errors[name]);

  const inputClass = (name) =>
    `input-field ${err(name) ? "border-red-300 ring-2 ring-red-100 focus:border-red-400 focus:ring-red-100" : ""}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
              <span className="text-3xl">🛒</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {mode === "login"
                ? "Log in to your Fresh Basket account"
                : "Join Fresh Basket today"}
            </p>
          </div>

          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button
              id="tab-login"
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "login" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Login
            </button>
            <button
              id="tab-register"
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "register" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === "register" && (
              <div>
                <label htmlFor="name" className="label">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur("name")}
                  placeholder="John Doe"
                  className={inputClass("name")}
                  aria-invalid={!!err("name")}
                  aria-describedby={err("name") ? "name-error" : undefined}
                />
                {err("name") && (
                  <p id="name-error" className="text-xs text-red-600 mt-1">
                    {err("name")}
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                onBlur={() => handleBlur("email")}
                placeholder="you@example.com"
                className={inputClass("email")}
                aria-invalid={!!err("email")}
                aria-describedby={err("email") ? "email-error" : undefined}
              />
              {err("email") && (
                <p id="email-error" className="text-xs text-red-600 mt-1">
                  {err("email")}
                </p>
              )}
              {mode === "register" && isValidEmailFormat(form.email.trim()) && (
                <p className="text-xs mt-1 min-h-[1.25rem] text-gray-500">
                  {emailCheckLoading && <span>Checking availability…</span>}
                  {!emailCheckLoading && emailAvailable === false && (
                    <span className="text-red-600 font-medium">This email is already registered.</span>
                  )}
                  {!emailCheckLoading && emailAvailable === true && (
                    <span className="text-emerald-600 font-medium">Email is available.</span>
                  )}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={form.password}
                  onChange={handleChange}
                  onBlur={() => handleBlur("password")}
                  placeholder="••••••••"
                  className={`${inputClass("password")} pr-11`}
                  aria-invalid={!!err("password")}
                  aria-describedby={err("password") ? "password-error" : undefined}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-xs font-medium"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {err("password") && (
                <p id="password-error" className="text-xs text-red-600 mt-1">
                  {err("password")}
                </p>
              )}

              {mode === "register" && (
                <>
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Password rules
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {PASSWORD_RULES.map((rule) => {
                        const ok = rule.test(form.password);
                        return (
                          <li key={rule.id} className={`flex items-center gap-2 ${ok ? "text-emerald-700" : ""}`}>
                            <span className="w-4 text-center" aria-hidden>
                              {ok ? "✓" : "○"}
                            </span>
                            {rule.label}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {form.password.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Strength</span>
                        <span className={`font-semibold ${strengthStyles[passwordStrength].text}`}>
                          {strengthStyles[passwordStrength].label}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${strengthStyles[passwordStrength].bar}`}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={submitDisabled}
              className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait…" : mode === "login" ? "Login" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-primary-600 font-semibold hover:underline"
            >
              {mode === "login" ? "Register" : "Login"}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          <Link to="/seller-login" className="hover:text-primary-600 transition-colors">
            Are you a seller? Login here →
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
