/**
 * Shared auth validation — keep in sync with backend `middlewares/validate.js`
 * (PASSWORD_STRONG_REGEX).
 */

export const PASSWORD_STRONG_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

/** Loose email check for client-side / debounce gating (backend uses validator.isEmail). */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(email) {
  const s = String(email || "").trim();
  if (!s) return false;
  return EMAIL_REGEX.test(s);
}

export const PASSWORD_RULES = [
  { id: "len", label: "At least 6 characters", test: (p) => p.length >= 6 },
  { id: "upper", label: "One uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter (a–z)", test: (p) => /[a-z]/.test(p) },
  { id: "num", label: "One number", test: (p) => /\d/.test(p) },
  { id: "special", label: "One special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function passwordRulesMetCount(password) {
  const p = String(password || "");
  return PASSWORD_RULES.filter((r) => r.test(p)).length;
}

/** @returns {"weak" | "medium" | "strong"} */
export function getPasswordStrength(password) {
  const n = passwordRulesMetCount(password);
  if (n <= 2) return "weak";
  if (n <= 4) return "medium";
  return "strong";
}

export function validateRegister({ name, email, password }) {
  const errors = {};

  const n = String(name || "").trim();
  if (!n) errors.name = "Name is required.";
  else if (n.length < 2) errors.name = "Name must be at least 2 characters.";

  const e = String(email || "").trim();
  if (!e) errors.email = "Email is required.";
  else if (!isValidEmailFormat(e)) errors.email = "Please enter a valid email address.";

  const p = String(password || "");
  if (!p) errors.password = "Password is required.";
  else if (!PASSWORD_STRONG_REGEX.test(p)) {
    errors.password =
      "Password must be at least 6 characters and include uppercase, lowercase, number, and special character.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateLogin({ email, password }) {
  const errors = {};
  const e = String(email || "").trim();
  if (!e) errors.email = "Email is required.";
  else if (!isValidEmailFormat(e)) errors.email = "Please enter a valid email address.";

  const p = String(password || "");
  if (!p) errors.password = "Password is required.";

  return { valid: Object.keys(errors).length === 0, errors };
}
