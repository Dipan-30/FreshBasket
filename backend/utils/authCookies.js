/**
 * Cookie options must match between res.cookie and res.clearCookie
 * so browsers reliably drop httpOnly auth cookies.
 */
const isProd = process.env.NODE_ENV === "production";

export const userTokenCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
};

export const sellerTokenCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
};

export function clearUserTokenCookie(res) {
  res.clearCookie("token", userTokenCookieOptions);
}

export function clearSellerTokenCookie(res) {
  res.clearCookie("sellerToken", sellerTokenCookieOptions);
}
