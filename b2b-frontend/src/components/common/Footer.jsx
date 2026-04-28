import React from 'react';
import { Link } from 'react-router-dom';
import { routes } from '../../routes/routeConfig';
import { Globe, Mail, Phone, MapPin, Share2, MessageSquare } from 'lucide-react';
import styles from './Footer.module.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footerMain}>
      <div className={styles.footerContainer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <Link to={routes.LANDING} className={styles.footerLogo}>
              <span className={styles.logoText}>Mokshith</span>
              <span className={styles.logoBadge}>B2B</span>
            </Link>
            <p className={styles.brandDescription}>
              The leading B2B commerce platform for growing businesses. 
              Simplifying bulk ordering, credit management, and logistics.
            </p>
            <div className={styles.socialLinks}>
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

          <div className={styles.footerContact}>
            <h4>Contact Us</h4>
            <ul>
              <li><MapPin size={18} /> 123 Business Avenue, Tech City</li>
              <li><Phone size={18} /> +1 (555) 000-0000</li>
              <li><Mail size={18} /> support@mokshith.com</li>
            </ul>
          </div>
        </div>

        {/* Download App Section */}
        <div className={styles.footerDownloadApp}>
          <div className={styles.downloadContent}>
            <div className={styles.downloadText}>
              <h3>For better experience download our mobile application</h3>
              <p>Get real-time updates, track orders, and manage bulk purchases on the go.</p>
              <div className={styles.appBadges}>
                <a href="#" className={styles.appBadge}>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" />
                </a>
                <a href="#" className={styles.appBadge}>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="Download on the App Store" />
                </a>
              </div>
            </div>
            <div className={styles.downloadVisual}>
              <div className={styles.miniMockup}>
                <div className={styles.miniMockupScreen}>
                  <div className={styles.miniHeader}></div>
                  <div className={styles.miniBody}>
                    <div className={styles.miniCard}></div>
                    <div className={styles.miniCard}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>&copy; {currentYear} Mokshith Enterprises. All rights reserved.</p>
          <div className={styles.footerBottomLinks}>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
