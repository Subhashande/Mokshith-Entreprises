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

        {/* Download App Section */}
        <div className="footer-download-app">
          <div className="download-content">
            <div className="download-text">
              <h3>For better experience download our mobile application</h3>
              <p>Get real-time updates, track orders, and manage bulk purchases on the go.</p>
              <div className="app-badges">
                <a href="#" className="app-badge">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" />
                </a>
                <a href="#" className="app-badge">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="Download on the App Store" />
                </a>
              </div>
            </div>
            <div className="download-visual">
              <div className="mini-mockup">
                <div className="mini-mockup-screen">
                  <div className="mini-header"></div>
                  <div className="mini-body">
                    <div className="mini-card"></div>
                    <div className="mini-card"></div>
                  </div>
                </div>
              </div>
            </div>
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
          padding: 3rem 2rem 1.5rem;
          margin-top: auto;
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr;
          gap: 2.5rem;
          margin-bottom: 3rem;
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          margin-bottom: 1rem;
        }

        .footer-download-app {
          background: linear-gradient(to right, var(--primary-light), white);
          border-radius: var(--radius-xl);
          padding: 2rem;
          margin-bottom: 3rem;
          border: 1px solid var(--border);
        }

        .download-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
        }

        .download-text h3 {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 0.75rem;
          color: var(--text-main);
        }

        .download-text p {
          color: var(--text-muted);
          margin-bottom: 1.5rem;
          max-width: 500px;
          font-size: 0.9375rem;
        }

        .app-badges {
          display: flex;
          gap: 0.875rem;
        }

        .app-badge img {
          height: 36px;
          transition: transform var(--transition-fast);
        }

        .app-badge:hover img {
          transform: translateY(-2px);
        }

        .download-visual {
          flex-shrink: 0;
        }

        .mini-mockup {
          width: 120px;
          height: 200px;
          background: #1a1a1a;
          border-radius: 1.25rem;
          padding: 5px;
          box-shadow: var(--shadow-lg);
        }

        .mini-mockup-screen {
          background: white;
          height: 100%;
          border-radius: 1rem;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .mini-header {
          height: 32px;
          background: var(--primary);
        }

        .mini-body {
          flex: 1;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .mini-card {
          height: 50px;
          background: #f1f5f9;
          border-radius: 0.375rem;
        }

        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          .download-content {
            flex-direction: column;
            text-align: center;
            gap: 1.5rem;
          }
          .app-badges {
            justify-content: center;
          }
          .download-text p {
            margin-left: auto;
            margin-right: auto;
          }
        }

        .logo-text {
          font-size: 1.25rem;
          font-weight: 800;
          color: #000000;
          letter-spacing: -0.02em;
        }

        .logo-badge {
          background-color: var(--primary);
          color: white;
          font-size: 0.625rem;
          font-weight: 700;
          padding: 0.125rem 0.4rem;
          border-radius: var(--radius-sm);
        }

        .brand-description {
          color: #4b5563;
          line-height: 1.5;
          margin-bottom: 1.25rem;
          font-size: 0.875rem;
        }

        .social-links {
          display: flex;
          gap: 1rem;
        }

        .social-links a {
          color: #4b5563;
          transition: var(--transition-fast);
        }

        .social-links a:hover {
          color: var(--primary);
        }

        .footer-links h4, .footer-contact h4 {
          font-size: 0.9375rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #000000;
        }

        .footer-links ul, .footer-contact ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-links li {
          margin-bottom: 0.5rem;
        }

        .footer-links a {
          color: #4b5563;
          text-decoration: none;
          font-size: 0.875rem;
          transition: var(--transition-fast);
        }

        .footer-links a:hover {
          color: var(--primary);
        }

        .footer-contact li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #4b5563;
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }

        .footer-bottom {
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #4b5563;
          font-size: 0.8125rem;
        }

        .footer-bottom-links {
          display: flex;
          gap: 1.5rem;
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
            gap: 2.5rem;
          }
        }

        @media (max-width: 576px) {
          .footer-grid {
            grid-template-columns: 1fr;
          }
          .footer-bottom {
            flex-direction: column;
            gap: 1.25rem;
            text-align: center;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;