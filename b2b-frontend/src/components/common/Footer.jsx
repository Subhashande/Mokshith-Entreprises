import React from 'react';
import { Link } from 'react-router-dom';
import { routes } from '../../routes/routeConfig';
import { Globe, Mail, Phone, MapPin, Share2, MessageSquare } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-main">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to={routes.LANDING} className="footer-logo">
              <span className="logo-text">Mokshith</span>
              <span className="logo-badge">B2B</span>
            </Link>
            <p className="brand-description">
              The leading B2B commerce platform for growing businesses. 
              Simplifying bulk ordering, credit management, and logistics.
            </p>
            <div className="social-links">
              <a href="#" aria-label="Website"><Globe size={20} /></a>
              <a href="#" aria-label="Contact"><MessageSquare size={20} /></a>
              <a href="#" aria-label="Share"><Share2 size={20} /></a>
            </div>
          </div>

          <div className="footer-links">
            <h4>Products</h4>
            <ul>
              <li><Link to={routes.PRODUCTS}>Browse Products</Link></li>
              <li><a href="#">Bulk Orders</a></li>
              <li><a href="#">Custom Pricing</a></li>
              <li><a href="#">New Arrivals</a></li>
            </ul>
          </div>

          <div className="footer-links">
            <h4>Company</h4>
            <ul>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Press</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>

          <div className="footer-contact">
            <h4>Contact Us</h4>
            <ul>
              <li><MapPin size={18} /> 123 Business Avenue, Tech City</li>
              <li><Phone size={18} /> +1 (555) 000-0000</li>
              <li><Mail size={18} /> support@mokshith.com</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {currentYear} Mokshith Enterprises. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
          </div>
        </div>
      </div>

      <style>{`
        .footer-main {
          background-color: var(--surface);
          border-top: 1px solid var(--border);
          padding: 5rem 2rem 2rem;
          margin-top: auto;
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr;
          gap: 4rem;
          margin-bottom: 4rem;
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          margin-bottom: 1.5rem;
        }

        .logo-text {
          font-size: 1.5rem;
          font-weight: 800;
          color: #000000;
          letter-spacing: -0.02em;
        }

        .logo-badge {
          background-color: var(--primary);
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-sm);
        }

        .brand-description {
          color: #4b5563;
          line-height: 1.6;
          margin-bottom: 1.5rem;
          font-size: 0.9375rem;
        }

        .social-links {
          display: flex;
          gap: 1.25rem;
        }

        .social-links a {
          color: #4b5563;
          transition: var(--transition-fast);
        }

        .social-links a:hover {
          color: var(--primary);
        }

        .footer-links h4, .footer-contact h4 {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: #000000;
        }

        .footer-links ul, .footer-contact ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-links li {
          margin-bottom: 0.75rem;
        }

        .footer-links a {
          color: #4b5563;
          text-decoration: none;
          font-size: 0.9375rem;
          transition: var(--transition-fast);
        }

        .footer-links a:hover {
          color: var(--primary);
        }

        .footer-contact li {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #4b5563;
          font-size: 0.9375rem;
          margin-bottom: 1rem;
        }

        .footer-bottom {
          padding-top: 2rem;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #4b5563;
          font-size: 0.875rem;
        }

        .footer-bottom-links {
          display: flex;
          gap: 2rem;
        }

        .footer-bottom-links a {
          color: #4b5563;
          text-decoration: none;
          transition: var(--transition-fast);
        }

        .footer-bottom-links a:hover {
          color: var(--primary);
        }

        @media (max-width: 992px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 3rem;
          }
        }

        @media (max-width: 576px) {
          .footer-grid {
            grid-template-columns: 1fr;
          }
          .footer-bottom {
            flex-direction: column;
            gap: 1.5rem;
            text-align: center;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;