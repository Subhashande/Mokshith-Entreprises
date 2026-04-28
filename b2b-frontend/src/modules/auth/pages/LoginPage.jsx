import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../hooks/useAuth";
import { useSelector } from "react-redux";
import { routes } from "../../../routes/routeConfig";
import { loginSchema } from "../../../validations/schemas";
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data) => {
    try {
      await login(data);
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

          <form onSubmit={handleSubmit(onSubmit)} className={styles.authForm} noValidate>
            {error && (
              <div className={styles.errorMessage} role="alert" aria-live="polite">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            
            <div className={styles.formGroup}>
              <label htmlFor="identifier">Email Address</label>
              <div className={styles.inputWrapper}>
                <Mail size={18} className={styles.inputIcon} aria-hidden="true" />
                <input
                  id="identifier"
                  type="email"
                  placeholder="name@company.com"
                  aria-label="Email address"
                  aria-invalid={errors.identifier ? 'true' : 'false'}
                  aria-describedby={errors.identifier ? 'identifier-error' : undefined}
                  {...register('identifier')}
                />
              </div>
              {errors.identifier && (
                <span id="identifier-error" className={styles.fieldError} role="alert">
                  {errors.identifier.message}
                </span>
              )}
            </div>

            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label htmlFor="password">Password</label>
                <Link to="#" className={styles.forgotLink}>Forgot password?</Link>
              </div>
              <div className={styles.inputWrapper}>
                <Lock size={18} className={styles.inputIcon} aria-hidden="true" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  aria-label="Password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <span id="password-error" className={styles.fieldError} role="alert">
                  {errors.password.message}
                </span>
              )}
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
              disabled={loading || isSubmitting}
              aria-busy={loading || isSubmitting}
            >
              {loading || isSubmitting ? "Signing in..." : "Sign In"}
              {!loading && !isSubmitting && <ArrowRight size={18} aria-hidden="true" />}
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