import { useState, useCallback } from "react";
import { reviewService } from "../services/reviewService";

export const useReview = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReviews = useCallback(async (productId) => {
    setLoading(true);
    try {
      const data = await reviewService.getReviews(productId);
      setReviews(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addReview = async (payload) => {
    try {
      const newReview = await reviewService.addReview(payload);
      setReviews((prev) => [newReview, ...prev]);
    } catch (err) {
      setError(err.message);
    }
  };

  return { reviews, loading, error, fetchReviews, addReview };
};