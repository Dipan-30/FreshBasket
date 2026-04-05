import React, { useState } from "react";
import toast from "react-hot-toast";
import StarRating from "./StarRating";
import { submitOrderReview } from "../services/orderApi";

const ReviewForm = ({ orderId, onSuccess, onCancel }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      toast.error("Please choose a rating from 1 to 5.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await submitOrderReview(orderId, { rating, comment });
      if (data.success) {
        toast.success("Thanks for your review!");
        onSuccess?.(data.order);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Your rating</p>
        <StarRating value={rating} onChange={setRating} disabled={submitting} />
      </div>
      <div>
        <label htmlFor={`review-comment-${orderId}`} className="text-sm font-medium text-gray-700 block mb-1">
          Comment <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id={`review-comment-${orderId}`}
          rows={4}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={submitting}
          className="input-field resize-none text-sm"
          placeholder="How was your order?"
        />
      </div>
      <div className="flex flex-wrap gap-2 justify-end pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={submitting} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
        )}
        <button type="submit" disabled={submitting} className="btn-primary text-sm py-2.5 px-5">
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </form>
  );
};

export default ReviewForm;
