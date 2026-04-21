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
  ArrowRight 
} from 'lucide-react';
import { routes } from '../../../routes/routeConfig';
import { useAuth } from '../../auth/hooks/useAuth';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: <ShoppingBag className="w-6 h-6 text-blue-600" />,
      title: "Bulk Ordering",
      description: "Optimized for large volume purchases with multi-tier pricing and dedicated support."
    },
    {
      icon: <CreditCard className="w-6 h-6 text-blue-600" />,
      title: "Credit & Flexible Payments",
      description: "Manage business credit lines and choose from multiple secure payment options."
    },
    {
      icon: <Truck className="w-6 h-6 text-blue-600" />,
      title: "Fast Delivery & Tracking",
      description: "Reliable logistics network with real-time tracking for every shipment."
    }
  ];

  const stats = [
    { label: "Used by businesses", value: "1,000+" },
    { label: "Orders processed", value: "50,000+" },
    { label: "Active vendors", value: "500+" }
  ];

  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Smart B2B Commerce Platform for Growing Businesses
          </h1>
          <p className="hero-subtitle">
            Manage bulk purchases, credit, and logistics in one seamless system. Built for modern enterprises.
          </p>
          <div className="hero-actions">
            {user ? (
              <button 
                onClick={() => navigate(routes.DASHBOARD)}
                className="premium-button premium-button-primary"
              >
                Go to Dashboard <ArrowRight size={18} />
              </button>
            ) : (
              <button 
                onClick={() => navigate(routes.REGISTER)}
                className="premium-button premium-button-primary"
              >
                Get Started <ArrowRight size={18} />
              </button>
            )}
            <button 
              onClick={() => navigate(routes.PRODUCTS)}
              className="premium-button premium-button-secondary"
            >
              Browse Products
            </button>
          </div>
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
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
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

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to transform your business?</h2>
          <p>Join thousands of businesses already scaling with our platform.</p>
          <button 
            onClick={() => navigate(routes.REGISTER)}
            className="premium-button premium-button-primary"
          >
            Create Your Account <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <style>{`
        .landing-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .hero-section {
          padding: 8rem 2rem;
          background: radial-gradient(circle at top right, var(--primary-light), transparent);
          display: flex;
          justify-content: center;
          text-align: center;
        }

        .hero-content {
          max-width: 800px;
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
          justify-content: center;
        }

        .features-section {
          padding: 6rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .section-header h2 {
          font-size: 2.25rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .section-header p {
          color: var(--text-muted);
          font-size: 1.125rem;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .feature-card {
          padding: 2.5rem;
          text-align: left;
        }

        .feature-icon-wrapper {
          width: 3rem;
          height: 3rem;
          background: var(--primary-light);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .feature-card h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .feature-card p {
          color: var(--text-muted);
          line-height: 1.6;
        }

        .stats-section {
          background-color: var(--text-main);
          color: white;
          padding: 4rem 2rem;
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
          gap: 0.5rem;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 800;
        }

        .stat-label {
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .cta-section {
          padding: 8rem 2rem;
          text-align: center;
          background-color: var(--surface);
        }

        .cta-content {
          max-width: 600px;
          margin: 0 auto;
        }

        .cta-content h2 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .cta-content p {
          color: var(--text-muted);
          margin-bottom: 2.5rem;
          font-size: 1.125rem;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.5rem;
          }
          .hero-actions {
            flex-direction: column;
          }
          .stats-container {
            flex-direction: column;
            gap: 3rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;