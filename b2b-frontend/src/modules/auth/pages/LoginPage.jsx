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

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const { config } = useSelector((state) => state.superAdmin);

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
    <div className="auth-container">
      <div className="auth-sidebar">
        <div className="sidebar-content">
          <Link to={routes.LANDING} className="sidebar-logo">
            <span className="logo-text">Mokshith</span>
            <span className="logo-badge">B2B</span>
          </Link>
          <div className="sidebar-features">
            <div className="feature-item">
              <div className="feature-icon"><LayoutDashboard size={20} /></div>
              <div>
                <h4>Unified Dashboard</h4>
                <p>Manage all your business operations from a single professional interface.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Building2 size={20} /></div>
              <div>
                <h4>Vendor Management</h4>
                <p>Onboard and manage multiple vendors with ease and transparency.</p>
              </div>
            </div>
          </div>
          <div className="sidebar-footer">
            <p>© 2026 Mokshith Enterprises</p>
          </div>
        </div>
      </div>

      <div className="auth-main">
        <div className="auth-form-wrapper">
          <div className="auth-header">
            <h1>Welcome back</h1>
            <p>Enter your credentials to access your business account</p>
          </div>

          {config?.maintenanceMode && (
            <div className="maintenance-banner">
              <AlertCircle size={18} />
              <span>System Under Maintenance</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
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

            <div className="form-group">
              <div className="label-row">
                <label>Password</label>
                <Link to="#" className="forgot-link">Forgot password?</Link>
              </div>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
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

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Remember me for 30 days</span>
              </label>
            </div>

            <button 
              type="submit" 
              className="premium-button premium-button-primary auth-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-footer-text">
            Don't have an account? <Link to={routes.REGISTER}>Create an account</Link>
          </div>
        </div>
      </div>

      <style>{`
        .auth-container {
          display: flex;
          min-height: 100vh;
          background-color: var(--surface);
        }

        .auth-sidebar {
          flex: 1;
          background-color: var(--text-main);
          color: white;
          padding: 4rem;
          display: flex;
          flex-direction: column;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          margin-bottom: 6rem;
        }

        .sidebar-features {
          display: flex;
          flex-direction: column;
          gap: 3rem;
          flex: 1;
        }

        .feature-item {
          display: flex;
          gap: 1.5rem;
        }

        .feature-icon {
          width: 2.5rem;
          height: 2.5rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .feature-item h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .feature-item p {
          color: #94a3b8;
          font-size: 0.9375rem;
          line-height: 1.6;
        }

        .sidebar-footer {
          color: #64748b;
          font-size: 0.875rem;
        }

        .auth-main {
          flex: 1.5;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem;
        }

        .auth-form-wrapper {
          width: 100%;
          max-width: 440px;
        }

        .auth-header {
          margin-bottom: 3rem;
        }

        .auth-header h1 {
          font-size: 2rem;
          font-weight: 800;
          color: var(--text-main);
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }

        .auth-header p {
          color: var(--text-muted);
          font-size: 1.125rem;
        }

        .maintenance-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background-color: #fffbeb;
          border: 1px solid #fde68a;
          color: #92400e;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 2rem;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .forgot-link {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--primary);
          text-decoration: none;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .input-wrapper input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 3rem;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          font-size: 0.9375rem;
          transition: var(--transition-fast);
          background-color: #f8fafc;
        }

        .input-wrapper input:focus {
          border-color: var(--primary);
          background-color: white;
          outline: none;
          box-shadow: 0 0 0 4px var(--primary-light);
        }

        .form-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--text-muted);
          cursor: pointer;
        }

        .checkbox-label input {
          accent-color: var(--primary);
        }

        .auth-submit {
          margin-top: 1rem;
          padding: 0.875rem;
          font-size: 1rem;
        }

        .auth-footer-text {
          margin-top: 2rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.9375rem;
        }

        .auth-footer-text a {
          color: var(--primary);
          font-weight: 600;
          text-decoration: none;
        }

        .error-message {
          padding: 0.75rem 1rem;
          background-color: #fef2f2;
          border: 1px solid #fee2e2;
          color: var(--error);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 500;
        }

        @media (max-width: 992px) {
          .auth-sidebar {
            display: none;
          }
          .auth-main {
            padding: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;