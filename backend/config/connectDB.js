import mongoose from "mongoose";
import Order from "../models/Order.js";

/** Map legacy order statuses to placed / delivered after schema change */
async function migrateLegacyOrderStatuses() {
  try {
    const toPlaced = await Order.updateMany(
      { status: { $in: ["Order Placed", "Processing", "Shipped", "Cancelled"] } },
      { $set: { status: "placed" } }
    );
    const toDelivered = await Order.updateMany(
      { status: "Delivered" },
      [
        {
          $set: {
            status: "delivered",
            deliveredAt: { $ifNull: ["$deliveredAt", "$updatedAt"] },
          },
        },
      ]
    );
    if (toPlaced.modifiedCount > 0 || toDelivered.modifiedCount > 0) {
      console.log(
        `✅ Order status migration: ${toPlaced.modifiedCount} → placed, ${toDelivered.modifiedCount} → delivered`
      );
    }
  } catch (e) {
    console.error("⚠️ Order status migration:", e.message);
  }
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    await migrateLegacyOrderStatuses();
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
