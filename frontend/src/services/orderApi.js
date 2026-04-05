import axios from "axios";

const base = () => import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

axios.defaults.withCredentials = true;

export async function deliverOrder(orderId) {
  const { data } = await axios.put(`${base()}/api/orders/${orderId}/deliver`);
  return data;
}

export async function submitOrderReview(orderId, { rating, comment }) {
  const { data } = await axios.post(`${base()}/api/orders/${orderId}/review`, {
    rating,
    comment,
  });
  return data;
}

export async function fetchSellerReviews() {
  const { data } = await axios.get(`${base()}/api/seller/reviews`);
  return data;
}
