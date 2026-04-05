import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import {
  addProduct,
  listProducts,
  getProductById,
  updateStock,
  adjustProductQuantity,
  searchProducts,
  deleteProduct,
} from "../controller/product.controller.js";
import authSeller from "../middlewares/authSeller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory always exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
});

// Restrict uploads to image MIME types only
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, png, webp, etc.)"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: imageFilter,
});

const router = express.Router();

router.post("/add-product", authSeller, upload.array("images", 5), addProduct);
router.get("/list", listProducts);
router.get("/search", searchProducts);
router.get("/id", getProductById);
router.post("/stock", authSeller, updateStock);
router.patch("/quantity", authSeller, adjustProductQuantity);
router.delete("/:id", authSeller, deleteProduct);

export default router;
