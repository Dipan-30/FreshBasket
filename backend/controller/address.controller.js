import Address from "../models/Address.js";

// POST /api/address/add
export const addAddress = async (req, res) => {
  try {
    const address = await Address.create({ ...req.body, userId: req.user._id });
    return res.status(201).json({ success: true, address });
  } catch (error) {
    console.error("addAddress error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/address/get
export const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user._id });
    return res.json({ success: true, addresses });
  } catch (error) {
    console.error("getAddresses error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
