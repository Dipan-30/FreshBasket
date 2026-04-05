import express from "express";
import { loginSeller, isAuthSeller, logoutSeller, getSellerReviews } from "../controller/seller.controller.js";
import authSeller from "../middlewares/authSeller.js";

const router = express.Router();

router.post("/login", loginSeller);
router.get("/is-auth", authSeller, isAuthSeller);
router.get("/logout", logoutSeller);
router.get("/reviews", authSeller, getSellerReviews);

export default router;
