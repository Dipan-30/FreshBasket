import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    offerPrice: { type: Number, required: true, min: 0 },
    image: { type: [String], required: true },
    category: {
      type: String,
      required: true,
      enum: ["Dairy", "Bakery", "Fruits", "Vegetables", "Snacks", "Beverages", "Breakfast", "Protein", "Spices", "Other"],
    },
    inStock: { type: Boolean, default: true },
    quantity: { type: Number, default: 10, min: 0 },
  },
  { timestamps: true }
);

// Full-text search index on name and description
productSchema.index({ name: "text", description: "text" }, { weights: { name: 3, description: 1 } });

const Product = mongoose.model("Product", productSchema);
export default Product;
