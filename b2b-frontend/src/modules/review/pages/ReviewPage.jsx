import { useState, useEffect } from "react";
import { useReview } from "../hooks/useReview";
import RatingStars from "../components/RatingStars";

const ReviewPage = ({ productId }) => {
  const { reviews, fetchReviews, addReview, loading, error } = useReview();

  const [form, setForm] = useState({
    rating: 0,
    comment: "",
  });

  useEffect(() => {
    fetchReviews(productId);
  }, [productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addReview({ ...form, productId });
    setForm({ rating: 0, comment: "" });
  };

  if (loading) return <p>Loading reviews...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Reviews</h2>

      <form onSubmit={handleSubmit}>
        <RatingStars
          value={form.rating}
          onChange={(rating) => setForm({ ...form, rating })}
        />

        <textarea
          placeholder="Write your review..."
          value={form.comment}
          onChange={(e) =>
            setForm({ ...form, comment: e.target.value })
          }
        />

        <button type="submit">Submit</button>
      </form>

      <hr />

      {reviews.map((r) => (
        <div key={r.id}>
          <RatingStars value={r.rating} />
          <p>{r.comment}</p>
          <small>{new Date(r.createdAt).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
};

export default ReviewPage;