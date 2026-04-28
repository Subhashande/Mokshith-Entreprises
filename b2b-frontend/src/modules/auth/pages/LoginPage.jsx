import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSelector } from "react-redux";
import { routes } from "../../../routes/routeConfig";
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  Briefcase, 
  AlertCircle,
  LayoutDashboard,
  Building2
} from 'lucide-react';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading, error, user } = useAuth();
  const { config } = useSelector((state) => state.superAdmin);

  // Redirect if already logged in removed for manual control

  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(form);
      // Success is handled by useAuth/AppRoutes
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authSidebar}>
        <div className={styles.sidebarContent}>
          <Link to={routes.LANDING} className={styles.sidebarLogo}>
            <span className={styles.logoText}>Mokshith</span>
            <span className={styles.logoBadge}>B2B</span>
          </Link>
          <div className={styles.sidebarFeatures}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}><LayoutDashboard size={20} /></div>
              <div>
                <h4>Unified Dashboard</h4>
                <p>Manage all your business operations from a single professional interface.</p>
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}><Building2 size={20} /></div>
              <div>
                <h4>Vendor Management</h4>
                <p>Onboard and manage multiple vendors with ease and transparency.</p>
              </div>
            </div>
          </div>
          <div className={styles.sidebarFooter}>
            <p>© 2026 Mokshith Enterprises</p>
          </div>
        </div>
      </div>

      <div className={styles.authMain}>
        <div className={styles.authFormWrapper}>
          <div className={styles.authHeader}>
            <h1>Welcome back</h1>
            <p>Enter your credentials to access your business account</p>
          </div>

          {config?.maintenanceMode && (
            <div className={styles.maintenanceBanner}>
              <AlertCircle size={18} />
              <span>System Under Maintenance</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.authForm}>
            {error && <div className={styles.errorMessage}>{error}</div>}
            
            <div className={styles.formGroup}>
              <label>Email Address</label>
              <div className={styles.inputWrapper}>
                <Mail size={18} className={styles.inputIcon} />
                <input
                  type="text"
                  name="identifier"
                  placeholder="name@company.com"
                  value={form.identifier}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label>Password</label>
                <Link to="#" className={styles.forgotLink}>Forgot password?</Link>
              </div>
              <div className={styles.inputWrapper}>
                <Lock size={18} className={styles.inputIcon} />
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className={styles.formOptions}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" />
                <span>Remember me for 30 days</span>
              </label>
            </div>

            <button 
              type="submit" 
              className={`btn-primary ${styles.authSubmit}`}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className={styles.authFooterText}>
            Don't have an account? <Link to={routes.REGISTER}>Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;