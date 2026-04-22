import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProduct } from "../hooks/useProduct";
import { useOrder } from "../../order/hooks/useOrder";
import { useAuth } from "../../auth/hooks/useAuth";
import { productService } from "../services/productService";
import { reviewService } from "../../review/services/reviewService";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import Navbar from "../../../components/common/Navbar";
import Input from "../../../components/ui/Input";
import { routes } from "../../../routes/routeConfig";
import { Plus, Minus, ShieldCheck, Truck, Receipt, Star } from "lucide-react";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useOrder();
  const { user } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qty, setQty] = useState(1);
  
  // Review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const [productRes, reviewsRes] = await Promise.all([
        productService.getProductById(id),
        reviewService.getReviews(id)
      ]);
      const data = productRes.data || productRes;
      setProduct(data);
      setReviews(reviewsRes.data || []);
      
      // Set initial quantity to MOQ
      const minQty = data.minOrderQty || data.moq || 1;
      setQty(minQty);
    } catch (err) {
      setError(err.message || "Failed to load product details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleAddToCart = () => {
    const minQty = product.minOrderQty || product.moq || 1;
    if (qty < minQty) {
      alert(`Minimum ${minQty} quantity required for this product.`);
      return;
    }
    addToCart({ ...product, quantity: qty });
    alert(`${product.name} (${qty} ${product.unit || 'units'}) added to cart!`);
  };

  const handleBuyNow = () => {
    const minQty = product.minOrderQty || product.moq || 1;
    if (qty < minQty) {
      alert(`Minimum ${minQty} quantity required for this product.`);
      return;
    }
    addToCart({ ...product, quantity: qty });
    navigate(routes.CHECKOUT);
  };

  const handleDecrease = () => {
    const minQty = product.minOrderQty || product.moq || 1;
    if (qty > minQty) setQty(qty - 1);
  };

  const handleIncrease = () => {
    setQty(qty + 1);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) return navigate(routes.LOGIN);
    
    setSubmittingReview(true);
    try {
      await reviewService.addReview({
        productId: id,
        rating,
        comment
      });
      alert("Review added successfully!");
      setComment("");
      fetchDetails(); // Refresh reviews
    } catch (err) {
      alert(err.message || "Failed to add review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) return product.images[0];
    if (product.image && !product.image.includes('📦')) return product.image;
    
    const category = (product.category || product.categoryId?.name || "").toLowerCase();
    const name = (product.name || "").toLowerCase();
    
    if (category.includes('rice') || name.includes('rice'))
      return "https://images.unsplash.com/photo-1586201327693-86750f72332e?auto=format&fit=crop&w=800&q=80";
    if (category.includes('dal') || name.includes('dal') || category.includes('pulse'))
      return "https://images.unsplash.com/photo-1547825407-2d060104b7f8?auto=format&fit=crop&w=800&q=80";
    if (category.includes('oil') || name.includes('oil'))
      return "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80";
    if (category.includes('sugar') || name.includes('sugar') || category.includes('salt'))
      return "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=800&q=80";
    
    return "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=800&q=80";
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>Loading product details...</p>
    </div>
  );

  if (error || !product) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--error)' }}>{error || "Product not found"}</p>
      <Button onClick={() => navigate(-1)}>Go Back</Button>
    </div>
  );

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh' }}>
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '4rem' }}>
          {/* Image Section */}
          <div style={{ borderRadius: '1rem', overflow: 'hidden', backgroundColor: '#f8fafc', border: '1px solid var(--border)' }}>
            <img 
              src={getProductImage(product)} 
              alt={product.name} 
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>

          {/* Info Section */}
          <div>
            <nav style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Products / {product.category || product.categoryId?.name}
            </nav>
            
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem' }}>{product.name}</h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', color: '#fbbf24' }}>
                {[...Array(5)].map((_, i) => (
                  <span key={i} style={{ fontSize: '1.25rem' }}>{i < Math.round(product.averageRating || 4.5) ? '★' : '☆'}</span>
                ))}
              </div>
              <span style={{ color: 'var(--text-muted)' }}>({reviews.length} reviews)</span>
            </div>

            <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '2rem' }}>
              ₹{product.price?.toLocaleString()}
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '400', marginLeft: '0.5rem' }}>+ 18% GST</span>
            </p>

            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '2.5rem', fontSize: '1.125rem' }}>
              {product.description}
            </p>

            <div style={{ marginBottom: '2.5rem' }}>
              <p style={{ fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Quantity Selection <span style={{ fontSize: '0.75rem', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '2px 8px', borderRadius: '12px' }}>Wholesale Only</span>
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '2px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden', height: '50px' }}>
                  <button 
                    onClick={handleDecrease}
                    style={{ padding: '0 1.25rem', height: '100%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <Minus size={18} />
                  </button>
                  <span style={{ width: '60px', textAlign: 'center', fontSize: '1.25rem', fontWeight: '700' }}>{qty}</span>
                  <button 
                    onClick={handleIncrease}
                    style={{ padding: '0 1.25rem', height: '100%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <p style={{ margin: 0 }}>Unit: <strong>{product.unit || 'units'}</strong></p>
                  <p style={{ margin: 0 }}>MOQ: <strong>{product.minOrderQty || product.moq || 1} {product.unit || 'units'}</strong></p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button onClick={handleAddToCart} variant="secondary" style={{ flex: 1, padding: '1rem', height: '56px', fontSize: '1rem', fontWeight: '700' }}>Add to Cart</Button>
              <Button onClick={handleBuyNow} style={{ flex: 1, padding: '1rem', height: '56px', fontSize: '1rem', fontWeight: '700' }}>Buy Now</Button>
            </div>

            <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.75rem' }}>
                <Truck className="text-blue-600" size={24} />
                <div>
                  <p style={{ margin: 0, fontWeight: '700', fontSize: '0.875rem' }}>Bulk Logistics</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Express transport</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.75rem' }}>
                <Receipt className="text-blue-600" size={24} />
                <div>
                  <p style={{ margin: 0, fontWeight: '700', fontSize: '0.875rem' }}>GST Invoicing</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Business input claim</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '3rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem' }}>Customer Reviews</h2>
            {reviews.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '0.5rem' }}>
                No reviews yet. Be the first to review!
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {reviews.map((rev) => (
                  <Card key={rev._id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: '700' }}>{rev.userId?.name || 'Verified Buyer'}</span>
                      <div style={{ color: '#fbbf24' }}>
                        {[...Array(5)].map((_, i) => (
                          <span key={i}>{i < rev.rating ? '★' : '☆'}</span>
                        ))}
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-main)', lineHeight: '1.5' }}>{rev.comment}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Review Form */}
          <div>
            <Card style={{ position: 'sticky', top: '6rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Write a Review</h3>
              <form onSubmit={handleSubmitReview}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Rating</label>
                  <select 
                    value={rating} 
                    onChange={(e) => setRating(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}
                  >
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Comment</label>
                  <textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    placeholder="Share your experience with this product..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', minHeight: '120px', resize: 'vertical' }}
                  />
                </div>
                <Button type="submit" style={{ width: '100%' }} disabled={submittingReview}>
                  {submittingReview ? 'Submitting...' : 'Post Review'}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetails;
