import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  CreditCard, 
  Truck, 
  ChevronRight, 
  Users, 
  Globe, 
  ShieldCheck, 
  ArrowRight,
  Receipt,
  Activity,
  LayoutGrid,
  Package,
  Droplets,
  Wheat,
  Utensils,
  Cookie,
  Coffee
} from 'lucide-react';
import { routes } from '../../../routes/routeConfig';
import { useAuth } from '../../auth/hooks/useAuth';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const categories = [
    { name: "Rice & Grains", icon: <Wheat className="w-5 h-5" />, slug: "rice-grains" },
    { name: "Pulses & Dals", icon: <Package className="w-5 h-5" />, slug: "pulses-dals" },
    { name: "Edible Oils", icon: <Droplets className="w-5 h-5" />, slug: "edible-oils" },
    { name: "FMCG", icon: <LayoutGrid className="w-5 h-5" />, slug: "fmcg" },
    { name: "Sugar & Salt", icon: <Cookie className="w-5 h-5" />, slug: "sugar-salt" },
    { name: "Beverages", icon: <Coffee className="w-5 h-5" />, slug: "beverages" }
  ];

  const features = [
    {
      icon: <ShoppingBag className="w-6 h-6 text-blue-600" />,
      title: "Bulk Ordering",
      description: "Optimized for large volume purchases with multi-tier pricing."
    },
    {
      icon: <CreditCard className="w-6 h-6 text-blue-600" />,
      title: "Credit System",
      description: "Manage business credit lines and flexible payment options."
    },
    {
      icon: <Truck className="w-6 h-6 text-blue-600" />,
      title: "Fast Delivery",
      description: "Reliable logistics network with next-day delivery options."
    },
    {
      icon: <Receipt className="w-6 h-6 text-blue-600" />,
      title: "GST Invoicing",
      description: "Automated GST-compliant invoices for all your business orders."
    },
    {
      icon: <Activity className="w-6 h-6 text-blue-600" />,
      title: "Real-time Tracking",
      description: "Track your shipments in real-time from warehouse to doorstep."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
      title: "Secure Payments",
      description: "Multiple secure payment gateways with fraud protection."
    }
  ];

  const products = [
    { name: "Sona Masoori Rice", price: "₹1,150", unit: "25kg Bag", img: "🍚", minQty: 10, category: "Rice & Grains" },
    { name: "Toor Dal Premium", price: "₹145", unit: "1kg Pouch", img: "🫘", minQty: 50, category: "Pulses & Dals" },
    { name: "Sunflower Oil", price: "₹1,770", unit: "15L Tin", img: "🧴", minQty: 5, category: "Edible Oils" },
    { name: "Refined Sugar", price: "₹2,100", unit: "50kg Bag", img: "🧂", minQty: 5, category: "Sugar & Salt" }
  ];

  const stats = [
    { label: "Used by businesses", value: "1,000+" },
    { label: "Orders processed", value: "50,000+" },
    { label: "Active vendors", value: "500+" }
  ];

  const handleDashboard = () => {
    if (!user) {
      navigate(routes.LOGIN);
    } else {
      const rolePath = user.role.toLowerCase().replace('_', '-');
      // Special case for customers who go to /home or /dashboard
      if (user.role === 'B2B_CUSTOMER' || user.role === 'B2C_CUSTOMER') {
        navigate(routes.DASHBOARD);
      } else {
        navigate(`/${rolePath}/dashboard`);
      }
    }
  };

  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="hero-section">
        {/* ... existing hero code ... */}
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Smart B2B Commerce Platform for Growing Businesses
            </h1>
            <p className="hero-subtitle">
              Manage bulk purchases, credit, and logistics in one seamless system. Built for modern enterprises.
            </p>
            <div className="hero-actions">
              <button 
                onClick={handleDashboard}
                className="premium-button premium-button-primary"
              >
                {user ? 'Go to Dashboard' : 'Get Started'} <ArrowRight size={18} />
              </button>
              <button 
                onClick={() => navigate(routes.PRODUCTS)}
                className="premium-button premium-button-secondary"
              >
                Browse Products
              </button>
            </div>
          </div>

          <div className="hero-mockups">
            <div className="mockup-container">
              {/* Product Listing Screen */}
              <div className="mockup-screen mockup-1">
                <div className="mockup-inner">
                  <div className="mockup-header">
                    <div className="status-bar"></div>
                    <div className="app-nav">Rice & Grains</div>
                  </div>
                  <div className="mockup-content">
                    <div className="mockup-item">
                      <div className="item-img"></div>
                      <div className="item-details">
                        <div className="item-name">Sona Masoori Rice</div>
                        <div className="item-price">₹1,150 /bag</div>
                        <div className="item-bulk">Min. Order: 10 Bags</div>
                      </div>
                    </div>
                    <div className="mockup-item">
                      <div className="item-img"></div>
                      <div className="item-details">
                        <div className="item-name">Basmati Rice 25kg</div>
                        <div className="item-price">₹1,800 /bag</div>
                        <div className="item-bulk">Min. Order: 5 Bags</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Tracking Screen */}
              <div className="mockup-screen mockup-2">
                <div className="mockup-inner">
                  <div className="mockup-header">
                    <div className="status-bar"></div>
                    <div className="app-nav">Order Tracking</div>
                  </div>
                  <div className="mockup-content p-4">
                    <div className="tracking-id">ME1234567890</div>
                    <div className="tracking-timeline">
                      <div className="timeline-step active">Order Confirmed</div>
                      <div className="timeline-step active">Packed</div>
                      <div className="timeline-step active">Shipped</div>
                      <div className="timeline-step">Out for Delivery</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkout/Cart Screen */}
              <div className="mockup-screen mockup-3">
                <div className="mockup-inner">
                  <div className="mockup-header">
                    <div className="status-bar"></div>
                    <div className="app-nav">Checkout</div>
                  </div>
                  <div className="mockup-content p-4">
                    <div className="order-summary">
                      <div className="summary-row"><span>Subtotal</span><span>₹86,700</span></div>
                      <div className="summary-row"><span>GST (5%)</span><span>₹4,335</span></div>
                      <div className="summary-total"><span>Total Amount</span><span>₹91,035</span></div>
                    </div>
                    <div className="pay-button">Pay Now</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Strip */}
      <section className="category-strip">
        <div className="category-container">
          {categories.map((cat, i) => (
            <div key={i} className="category-item">
              <div className="category-icon">{cat.icon}</div>
              <span>{cat.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Value Proposition */}
      <section className="features-section">
        <div className="section-header">
          <h2>Why Choose Mokshith?</h2>
          <p>Everything you need to scale your business operations</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card premium-card">
              <div className="feature-icon-wrapper">
                {feature.icon}
              </div>
              <div className="feature-text">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Product Preview Section */}
      <section className="product-preview-section">
        <div className="section-header">
          <h2>Top Wholesale Deals</h2>
          <p>Direct from vendors with bulk pricing</p>
        </div>
        <div className="products-grid">
          {products.map((prod, i) => (
            <div key={i} className="product-mini-card">
              <div className="prod-img">{prod.img}</div>
              <div className="prod-info">
                <h4>{prod.name}</h4>
                <div className="prod-meta">
                  <span className="prod-price">{prod.price}</span>
                  <span className="prod-unit">/{prod.unit}</span>
                </div>
                <button className="add-btn">Add</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <div className="cta-content">
            <h2>Ready to transform your business?</h2>
            <p>Join thousands of businesses already scaling with our platform.</p>
            <button 
              onClick={handleDashboard}
              className="premium-button premium-button-primary"
            >
              {user ? 'Go to Dashboard' : 'Create Your Account'} <ChevronRight size={18} />
            </button>
          </div>
          <div className="cta-visual">
            <div className="credit-widget">
              <div className="widget-header">
                <CreditCard size={20} />
                <span>Credit Line</span>
              </div>
              <div className="widget-amount">₹25,000</div>
              <div className="widget-label">Available Limit</div>
              <div className="widget-bar"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust / Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          {stats.map((stat, index) => (
            <div key={index} className="stat-item">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .landing-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .hero-section {
          padding: 6rem 2rem;
          background: radial-gradient(circle at top right, var(--primary-light), transparent);
          overflow: hidden;
        }

        .hero-container {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 4rem;
          align-items: center;
        }

        .hero-content {
          text-align: left;
        }

        .hero-title {
          font-size: 3.5rem;
          font-weight: 800;
          line-height: 1.1;
          color: var(--text-main);
          margin-bottom: 1.5rem;
          letter-spacing: -0.02em;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          color: var(--text-muted);
          margin-bottom: 2.5rem;
          line-height: 1.6;
        }

        .hero-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-start;
        }

        .hero-mockups {
          position: relative;
          height: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mockup-container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .mockup-screen {
          position: absolute;
          width: 220px;
          height: 440px;
          background: white;
          border: 8px solid #1a1a1a;
          border-radius: 2rem;
          overflow: hidden;
          box-shadow: var(--shadow-xl);
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          animation: float 6s ease-in-out infinite;
        }

        .mockup-inner {
          height: 100%;
          display: flex;
          flex-direction: column;
          font-size: 0.75rem;
        }

        .mockup-header {
          background: var(--primary);
          color: white;
          padding: 1.5rem 1rem 0.75rem;
        }

        .status-bar {
          height: 4px;
          background: rgba(255,255,255,0.3);
          border-radius: 2px;
          margin-bottom: 0.5rem;
        }

        .app-nav {
          font-weight: 700;
          font-size: 0.875rem;
        }

        .mockup-content {
          flex: 1;
          background: #f8fafc;
          overflow-y: auto;
        }

        .mockup-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem;
          background: white;
          margin: 0.5rem;
          border-radius: 0.5rem;
          box-shadow: var(--shadow-sm);
        }

        .item-img {
          width: 40px;
          height: 40px;
          background: #e2e8f0;
          border-radius: 4px;
        }

        .item-name { font-weight: 600; }
        .item-price { color: var(--primary); font-weight: 700; }
        .item-bulk { color: var(--text-muted); font-size: 0.65rem; }

        .tracking-id { font-weight: 700; margin-bottom: 1rem; }
        .tracking-timeline { display: flex; flex-direction: column; gap: 1rem; }
        .timeline-step { 
          display: flex; 
          align-items: center; 
          gap: 0.5rem; 
          color: var(--text-muted);
        }
        .timeline-step.active { color: var(--primary); font-weight: 600; }
        .timeline-step::before {
          content: '';
          width: 8px;
          height: 8px;
          background: currentColor;
          border-radius: 50%;
        }

        .order-summary { display: flex; flex-direction: column; gap: 0.5rem; }
        .summary-row { display: flex; justify-content: space-between; }
        .summary-total { 
          display: flex; 
          justify-content: space-between; 
          font-weight: 800; 
          margin-top: 0.5rem;
          border-top: 1px dashed #cbd5e1;
          padding-top: 0.5rem;
        }
        .pay-button {
          background: var(--accent);
          color: white;
          text-align: center;
          padding: 0.75rem;
          border-radius: 0.5rem;
          margin-top: 1rem;
          font-weight: 700;
        }

        .mockup-1 { 
          z-index: 3; 
          transform: translateX(-20%) translateY(0) rotate(-5deg); 
        }
        .mockup-2 { 
          z-index: 2; 
          transform: translateX(20%) translateY(10%) rotate(5deg);
          animation-delay: -2s;
        }
        .mockup-3 { 
          z-index: 1; 
          transform: translateX(60%) translateY(20%) rotate(12deg);
          animation-delay: -4s;
        }

        .mockup-screen:hover {
          transform: scale(1.05) translateY(-10px) rotate(0);
          z-index: 10;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(var(--rot)); }
          50% { transform: translateY(-20px) rotate(var(--rot)); }
        }

        .mockup-1 { --rot: -5deg; }
        .mockup-2 { --rot: 5deg; }
        .mockup-3 { --rot: 12deg; }

        .category-strip {
          background: white;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 1rem 2rem;
        }

        .category-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          gap: 0.5rem;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .category-container::-webkit-scrollbar { display: none; }

        .category-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.375rem;
          min-width: 90px;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .category-item:hover {
          color: var(--primary);
          transform: translateY(-2px);
        }

        .category-icon {
          width: 2.5rem;
          height: 2.5rem;
          background: var(--primary-light);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }

        .category-item span {
          font-size: 0.8125rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .features-section {
          padding: 2rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .section-header h2 {
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: 0.25rem;
          color: var(--text-main);
        }

        .section-header p {
          color: var(--text-muted);
          font-size: 1rem;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .feature-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          text-align: left;
        }

        .feature-icon-wrapper {
          width: 2.5rem;
          height: 2.5rem;
          background: var(--primary-light);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .feature-text {
          flex: 1;
        }

        .feature-card h3 {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 0.125rem;
          color: var(--text-main);
        }

        .feature-card p {
          color: var(--text-muted);
          line-height: 1.3;
          font-size: 0.8125rem;
          margin: 0;
        }

        .product-preview-section {
          padding: 3rem 2rem;
          background: #f8fafc;
        }

        .products-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
        }

        .product-mini-card {
          background: white;
          border-radius: var(--radius-lg);
          padding: 0.875rem;
          display: flex;
          gap: 0.875rem;
          align-items: center;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
          transition: var(--transition-fast);
        }

        .product-mini-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .prod-img {
          font-size: 2.25rem;
          width: 54px;
          height: 54px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
        }

        .prod-info {
          flex: 1;
        }

        .prod-info h4 {
          font-size: 0.875rem;
          font-weight: 700;
          margin-bottom: 0.125rem;
        }

        .prod-meta {
          display: flex;
          align-items: baseline;
          gap: 0.25rem;
          margin-bottom: 0.375rem;
        }

        .prod-price {
          font-weight: 800;
          color: var(--primary);
          font-size: 0.9375rem;
        }

        .prod-unit {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .add-btn {
          width: 100%;
          padding: 0.375rem;
          border: 1px solid var(--primary);
          color: var(--primary);
          background: transparent;
          border-radius: var(--radius-sm);
          font-weight: 700;
          font-size: 0.8125rem;
          transition: var(--transition-fast);
        }

        .add-btn:hover {
          background: var(--primary);
          color: white;
        }

        .stats-section {
          background-color: var(--text-main);
          color: white;
          padding: 2.5rem 2rem;
        }

        .stats-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-around;
          text-align: center;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 800;
        }

        .stat-label {
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.6875rem;
          font-weight: 600;
        }

        .cta-section {
          padding: 3rem 2rem;
          background-color: white;
        }

        .cta-container {
          max-width: 1000px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 3rem;
          align-items: center;
          background: var(--primary-light);
          padding: 2.5rem;
          border-radius: var(--radius-xl);
        }

        .cta-content {
          text-align: left;
        }

        .cta-content h2 {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 0.75rem;
          line-height: 1.2;
        }

        .cta-content p {
          color: var(--text-muted);
          margin-bottom: 1.5rem;
          font-size: 1rem;
        }

        .cta-visual {
          display: flex;
          justify-content: center;
        }

        .credit-widget {
          background: white;
          padding: 1.25rem;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          width: 100%;
          max-width: 260px;
        }

        .widget-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--primary);
          font-weight: 700;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
        }

        .widget-amount {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-main);
        }

        .widget-label {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
        }

        .widget-bar {
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          position: relative;
          overflow: hidden;
        }

        .widget-bar::after {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 65%;
          background: var(--primary);
        }

        @media (max-width: 1024px) {
          .hero-container, .cta-container {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .hero-content, .cta-content { text-align: center; }
          .hero-actions { justify-content: center; }
          .hero-mockups { height: 400px; margin-top: 2rem; }
          .mockup-screen { width: 180px; height: 360px; }
          .cta-visual { display: none; }
        }

        @media (max-width: 768px) {
          .hero-title { font-size: 2.5rem; }
          .hero-actions { flex-direction: column; }
          .stats-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;