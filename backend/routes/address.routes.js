import express from "express";
import { addAddress, getAddresses } from "../controller/address.controller.js";
import authUser from "../middlewares/authUser.js";

const router = express.Router();

router.post("/add", authUser, addAddress);
router.get("/get", authUser, getAddresses);

export default router;
