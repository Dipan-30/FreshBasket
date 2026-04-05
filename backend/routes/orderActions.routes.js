import express from "express";
import { markOrderDelivered, addOrderReview } from "../controller/order.controller.js";
import authUser from "../middlewares/authUser.js";
import authSeller from "../middlewares/authSeller.js";

const router = express.Router();

router.put("/:id/deliver", authSeller, markOrderDelivered);
router.post("/:id/review", authUser, addOrderReview);

export default router;
