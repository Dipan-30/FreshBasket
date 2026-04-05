import express from "express";
import {
  registerUser,
  loginUser,
  isAuthUser,
  logoutUser,
  checkEmailAvailability,
} from "../controller/user.controller.js";
import authUser from "../middlewares/authUser.js";
import {
  registerValidation,
  loginValidation,
  checkEmailQueryValidation,
} from "../middlewares/validate.js";

const router = express.Router();

router.get("/check-email", checkEmailQueryValidation, checkEmailAvailability);
router.post("/register", registerValidation, registerUser);
router.post("/login", loginValidation, loginUser);
router.get("/is-auth", authUser, isAuthUser);
router.get("/logout", logoutUser);

export default router;
