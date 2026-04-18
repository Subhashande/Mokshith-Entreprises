import { useProduct } from "../hooks/useProduct";
import { useOrder } from "../../order/hooks/useOrder";
import { useAuth } from "../../auth/hooks/useAuth";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { routes } from "../../../routes/routeConfig";

const ProductPage = () => {
  const { products, loading, error } = useProduct();
  const { addToCart, cart } = useOrder();
  const { user, logout } = useAuth();
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
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh' }}>
      {/* Premium Header */}
      <header style={{ 
        backgroundColor: 'var(--surface)', 
        borderBottom: '1px solid var(--border)',
        padding: '1rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)' }}>Mokshith B2B</h1>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <a href={routes.HOME} style={{ fontWeight: '500', color: 'var(--text-main)' }}>Home</a>
            <a href={routes.ORDERS} style={{ fontWeight: '500', color: 'var(--text-muted)' }}>Orders</a>
            {user?.role === 'VENDOR' && <a href={routes.CREDIT} style={{ fontWeight: '500', color: 'var(--text-muted)' }}>Credit</a>}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div 
              onClick={() => navigate(routes.CHECKOUT)}
              style={{ position: 'relative', cursor: 'pointer', padding: '0.5rem' }}
            >
              🛒 <span style={{ 
                position: 'absolute', top: 0, right: 0, 
                backgroundColor: 'var(--error)', color: 'white', 
                fontSize: '0.65rem', borderRadius: '50%', 
                width: '18px', height: '18px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                {cart.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            </div>
            <div 
              onClick={logout}
              style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', color: 'var(--primary)', cursor: 'pointer' }}
            >
              {user?.name?.[0] || 'U'}
            </div>
          </div>
        </div>
      </header>

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
          {filteredProducts.map((product) => (
            <Card key={product.id} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '200px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '3rem' }}>{product.image || '📦'}</span>
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
                    {product.category}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU: {product.sku}</span>
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.5rem' }}>{product.name}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem', flex: 1 }}>
                  {product.description}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '1.25rem', fontWeight: '800' }}>₹{product.price}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>/ unit</span>
                  </div>
                  <span style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '600',
                    color: product.stock > 100 ? 'var(--success)' : 'var(--warning)'
                  }}>
                    {product.stock} in stock
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button 
                    onClick={() => handleAddToCart(product)}
                    variant="secondary" 
                    style={{ flex: 1 }}
                  >
                    Add to Cart
                  </Button>
                  <Button 
                    onClick={() => handleBuyNow(product)}
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
