import express from "express";
import { placeOrderCOD, getUserOrders, getAllOrders } from "../controller/order.controller.js";
import authUser from "../middlewares/authUser.js";
import authSeller from "../middlewares/authSeller.js";

const router = express.Router();

router.post("/cod", authUser, placeOrderCOD);
router.get("/user", authUser, getUserOrders);
router.get("/seller", authSeller, getAllOrders);

export default router;
