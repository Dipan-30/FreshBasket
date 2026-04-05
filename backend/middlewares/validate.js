import { body, query, validationResult } from "express-validator";

/** Matches frontend: min 6 + upper + lower + digit + special */
export const PASSWORD_STRONG_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

/**
 * Send 400 with structured validation payload (matches API contract).
 */
export function handleValidationErrors(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: result.array().map((e) => ({
        field: e.type === "field" ? e.path : e.type,
        message: e.msg,
      })),
    });
  }
  next();
}

export const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters."),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please enter a valid email address.")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters.")
    .matches(PASSWORD_STRONG_REGEX)
    .withMessage(
      "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character."
    ),
  handleValidationErrors,
];

export const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please enter a valid email address.")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required."),
  handleValidationErrors,
];

export const checkEmailQueryValidation = [
  query("email")
    .trim()
    .notEmpty()
    .withMessage("Email query is required.")
    .isEmail()
    .withMessage("Please enter a valid email address.")
    .normalizeEmail(),
  handleValidationErrors,
];
