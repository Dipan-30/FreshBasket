import express from "express";
import {
  getCartRecommendations,
  getRecommendationHistory,
  submitFeedback,
} from "../controller/recommendation.controller.js";
import authUser from "../middlewares/authUser.js";

const router = express.Router();

router.get("/cart", authUser, getCartRecommendations);
router.get("/history", authUser, getRecommendationHistory);
router.post("/feedback", authUser, submitFeedback);

export default router;
