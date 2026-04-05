import jwt from "jsonwebtoken";

const authSeller = async (req, res, next) => {
  const { sellerToken } = req.cookies;
  if (!sellerToken) {
    return res.status(401).json({ success: false, message: "Not authorized. Please login as seller." });
  }
  try {
    const decoded = jwt.verify(sellerToken, process.env.JWT_SECRET);
    if (decoded.email !== process.env.SELLER_EMAIL) {
      return res.status(401).json({ success: false, message: "Invalid seller credentials." });
    }
    next();
  } catch (error) {
    console.error("authSeller error:", error.message);
    // Clear sellerToken cookie on failure to resolve stale/invalid token scenarios
    res.clearCookie("sellerToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    return res.status(401).json({ success: false, message: "Seller session expired. Please login again." });
  }
};

export default authSeller;
