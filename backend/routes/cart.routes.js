import express from "express";
import { updateCart, clearCart } from "../controller/cart.controller.js";
import authUser from "../middlewares/authUser.js";

const router = express.Router();

router.post("/update", authUser, updateCart);
router.post("/clear", authUser, clearCart);

export default router;
