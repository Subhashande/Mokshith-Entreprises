import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProduct } from "../hooks/useProduct";
import { useOrder } from "../../order/hooks/useOrder";
import { useAuth } from "../../auth/hooks/useAuth";
import { routes } from "../../../routes/routeConfig";
import ProductCard from "../components/ProductCard";
import Toast from "../../../components/feedback/Toast";
import { Search, Filter, SlidersHorizontal, ChevronDown } from 'lucide-react';

const ProductPage = () => {
  const { products, loading, error } = useProduct();
  const { addToCart } = useOrder();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const handleAddToCart = (product) => {
    addToCart(product);
    setToast({ message: `${product.name} added to cart`, type: 'success' });
  };

  const handleBuyNow = (product) => {
    addToCart(product);
    navigate(routes.CHECKOUT);
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="loader"></div>
      <p>Loading premium catalog...</p>
    </div>
  );
  
  if (error) return (
    <div className="error-screen">
      <p>{error}</p>
      <button onClick={() => window.location.reload()} className="premium-button premium-button-primary">Retry</button>
    </div>
  );

  const categories = ["All", ...new Set(products.map(p => p.category || p.categoryId?.name || "General"))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.category || p.categoryId?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || (p.category || p.categoryId?.name || "General") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="page-container">
      <main className="main-content">
        <header className="catalog-header">
          <div className="header-info">
            <h1>Product Catalog</h1>
            <p>Premium selection for your business needs</p>
          </div>
          
          <div className="header-controls">
            <div className="search-wrapper">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search products, categories..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="premium-input search-input"
              />
            </div>
            
            <div className="filter-wrapper">
              <div className="category-select-wrapper">
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="category-select"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="select-arrow" />
              </div>
              
              <button className="filter-button">
                <SlidersHorizontal size={18} />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </header>

        <section className="product-grid-section">
          {filteredProducts.length > 0 ? (
            <div className="product-grid">
              {filteredProducts.map((product, index) => (
                <ProductCard 
                  key={product._id || product.id || index} 
                  product={product}
                  onAddToCart={handleAddToCart}
                  onBuyNow={handleBuyNow}
                  user={user}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No products found</h3>
              <p>Try adjusting your search or filters</p>
              <button onClick={() => { setSearchTerm(""); setSelectedCategory("All"); }} className="premium-button premium-button-secondary">
                Clear all filters
              </button>
            </div>
          )}
        </section>
      </main>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <style>{`
        .page-container {
          background-color: var(--background);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .main-content {
          padding: 3rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          flex: 1;
        }

        .catalog-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 3rem;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .header-info h1 {
          font-size: 2.25rem;
          font-weight: 800;
          color: var(--text-main);
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }

        .header-info p {
          color: var(--text-muted);
          font-size: 1.125rem;
        }

        .header-controls {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-wrapper {
          position: relative;
          width: 350px;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .search-input {
          padding-left: 3rem !important;
        }

        .filter-wrapper {
          display: flex;
          gap: 0.75rem;
        }

        .category-select-wrapper {
          position: relative;
        }

        .category-select {
          appearance: none;
          background: var(--surface);
          border: 1.5px solid var(--border);
          padding: 0.75rem 2.5rem 0.75rem 1rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          color: var(--text-main);
          cursor: pointer;
          min-width: 150px;
          transition: var(--transition-fast);
        }

        .category-select:focus {
          border-color: var(--primary);
          outline: none;
        }

        .select-arrow {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        .filter-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          font-weight: 600;
          color: var(--text-main);
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .filter-button:hover {
          background: var(--background);
          border-color: var(--secondary);
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
        }

        .loading-screen, .error-screen, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 5rem 2rem;
          text-align: center;
        }

        .loader {
          width: 40px;
          height: 40px;
          border: 3px solid var(--primary-light);
          border-top: 3px solid var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .empty-state h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: var(--text-muted);
          margin-bottom: 2rem;
        }

        @media (max-width: 768px) {
          .catalog-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .search-wrapper {
            width: 100%;
          }
          .filter-wrapper {
            width: 100%;
          }
          .category-select-wrapper {
            flex: 1;
          }
          .category-select {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductPage;