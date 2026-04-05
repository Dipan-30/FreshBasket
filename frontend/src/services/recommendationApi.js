import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// const BACKEND_URL = import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api"; //for deployment

/**
 * Fetch cart-based AI recommendations from the backend.
 * User must be authenticated (cookie-based).
 */
export const fetchCartRecommendations = async () => {
  const { data } = await axios.get(`${BACKEND_URL}/api/recommendations/cart`, {
    withCredentials: true,
  });
  if (!data.success) {
    throw new Error(data.message || "Failed to fetch recommendations");
  }
  return data.recommendations;
};

/**
 * Fetch cached recommendation history for the current cart.
 * Returns empty array if no cache exists — never triggers a new pipeline run.
 */
export const fetchRecommendationHistory = async () => {
  const { data } = await axios.get(
    `${BACKEND_URL}/api/recommendations/history`,
    {
      withCredentials: true,
    },
  );
  if (!data.success) return [];
  return data.recommendations || [];
};

/**
 * Submit like/dismiss feedback for a recommendation.
 * @param {string} productId
 * @param {"like"|"dismiss"} action
 */
export const submitFeedback = async (productId, action) => {
  await axios.post(
    `${BACKEND_URL}/api/recommendations/feedback`,
    { productId, action },
    { withCredentials: true },
  );
};
