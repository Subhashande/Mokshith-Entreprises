import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProduct } from "../hooks/useProduct";
import { useOrder } from "../../order/hooks/useOrder";
import { useAuth } from "../../auth/hooks/useAuth";
import { routes } from "../../../routes/routeConfig";
import ProductCard from "../components/ProductCard";
import Toast from "../../../components/feedback/Toast";
import { Search, Filter, SlidersHorizontal, ChevronDown } from 'lucide-react';
import styles from './ProductPage.module.css';

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
    <div className={styles.loadingScreen}>
      <div className={styles.loader}></div>
      <p>Loading premium catalog...</p>
    </div>
  );
  
  if (error) return (
    <div className={styles.errorScreen}>
      <p>{error}</p>
      <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
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
    <div className={styles.container}>
      <main className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerInfo}>
            <h1>Product Catalog</h1>
            <p>Premium selection for your business needs</p>
          </div>
          
          <div className={styles.headerControls}>
            <div className={styles.searchWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Search products, categories..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            
            <div className={styles.filterWrapper}>
              <div className={styles.categorySelectWrapper}>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={styles.categorySelect}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown size={16} className={styles.selectArrow} />
              </div>
              
              <button className={styles.filterButton}>
                <SlidersHorizontal size={18} />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </header>

        <section className={styles.productGridSection}>
          {filteredProducts.length > 0 ? (
            <div className={styles.productGrid}>
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
            <div className={styles.emptyState}>
              <h3>No products found</h3>
              <p>Try adjusting your search or filters</p>
              <button onClick={() => { setSearchTerm(""); setSelectedCategory("All"); }} className="btn-secondary">
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
    </div>
  );
};

export default ProductPage;