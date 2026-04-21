import { useProduct } from "../hooks/useProduct";
import { useOrder } from "../../order/hooks/useOrder";
import { useAuth } from "../../auth/hooks/useAuth";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Navbar from "../../../components/common/Navbar";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { routes } from "../../../routes/routeConfig";

const ProductPage = () => {
  const { products, loading, error } = useProduct();
  const { addToCart, cart } = useOrder();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleAddToCart = (product) => {
    addToCart(product);
    alert(`${product.name} added to cart!`);
  };

  const handleBuyNow = (product) => {
    addToCart(product);
    navigate(routes.CHECKOUT);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>Loading premium catalog...</p>
    </div>
  );
  
  if (error) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--error)' }}>{error}</p>
      <Button onClick={() => window.location.reload()} style={{ marginTop: '1rem' }}>Retry</Button>
    </div>
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.category || p.categoryId?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) return product.images[0];
    if (product.image && !product.image.includes('📦')) return product.image;
    
    // Professional placeholder images based on category
    const category = (product.category || product.categoryId?.name || "").toLowerCase();
    if (category.includes('laptop') || category.includes('electronics')) 
      return "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=500&q=80";
    if (category.includes('phone') || category.includes('mobile'))
      return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=80";
    if (category.includes('office') || category.includes('furniture'))
      return "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=500&q=80";
    
    return "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=500&q=80";
  };

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Product Catalog</h2>
            <p style={{ color: 'var(--text-muted)' }}>Browse and order items for your business</p>
          </div>
          <div style={{ width: '320px' }}>
            <Input 
              placeholder="Search products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>

        {/* Product Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {filteredProducts.map((product, index) => (
            <Card 
              key={product._id || product.id || index} 
              style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', cursor: 'pointer' }}
              onClick={() => navigate(`${routes.PRODUCTS}/${product._id || product.id}`)}
            >
              <div style={{ height: '220px', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
                <img 
                  src={getProductImage(product)} 
                  alt={product.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=500&q=80"; }}
                />
              </div>
              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '700', 
                    textTransform: 'uppercase', 
                    color: 'var(--primary)',
                    backgroundColor: 'var(--primary-light)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    {product.category || product.categoryId?.name || "Uncategorized"}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU: {product.sku || product._id?.substring(0, 8)}</span>
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.5rem' }}>{product.name}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem', flex: 1 }}>
                  {product.description}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '1.25rem', fontWeight: '800' }}>₹{product.price?.toLocaleString()}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>/ unit</span>
                  </div>
                  <span style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '600',
                    color: product.stock > 0 ? 'var(--success)' : 'var(--error)'
                  }}>
                    {product.stock} in stock
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    variant="secondary" 
                    style={{ flex: 1 }}
                  >
                    Add to Cart
                  </Button>
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBuyNow(product);
                    }}
                    style={{ flex: 1 }}
                  >
                    Buy Now
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>No products found matching your search.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProductPage;
