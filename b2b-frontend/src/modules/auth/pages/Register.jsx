import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { routes } from "../../../routes/routeConfig";
import { authService } from "../services/authService";
import { useAuth } from "../hooks/useAuth";
import { 
  User, 
  Building2, 
  Truck, 
  Mail, 
  Lock, 
  Phone, 
  ChevronRight, 
  ArrowLeft,
  Briefcase,
  ShieldCheck
} from 'lucide-react';
import styles from './Register.module.css';

const Register = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: Role Selection, 2: Details

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(routes.DASHBOARD);
    }
  }, [user, navigate]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    role: "B2B_CUSTOMER",
    companyName: "",
    gstNumber: "",
    vehicleType: ""
  });

  const roles = [
    {
      id: "B2B_CUSTOMER",
      label: "Business",
      description: "Bulk orders, credit lines, and tax invoices.",
      icon: <Building2 className="w-6 h-6" />
    },
    {
      id: "B2C_CUSTOMER",
      label: "Customer",
      description: "Individual shopping with premium experience.",
      icon: <User className="w-6 h-6" />
    },
    {
      id: "DELIVERY_PARTNER",
      label: "Delivery Partner",
      description: "Join our logistics network and fulfill orders.",
      icon: <Truck className="w-6 h-6" />
    }
  ];

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleRoleSelect = (roleId) => {
    setForm({ ...form, role: roleId });
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      await authService.register(form);
      setIsRegistered(true);
      // Removed immediate navigate to login
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
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
              <div className={styles.featureIcon}><ShieldCheck size={20} /></div>
              <div>
                <h4>Secure Transactions</h4>
                <p>Enterprise-grade security for all your business deals.</p>
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}><Briefcase size={20} /></div>
              <div>
                <h4>Business Tools</h4>
                <p>Advanced analytics and inventory management.</p>
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
          {step === 2 && (
            <button className={styles.backButton} onClick={() => setStep(1)}>
              <ArrowLeft size={18} /> <span>Back to roles</span>
            </button>
          )}

          <div className={styles.authHeader}>
            <h1>{step === 1 ? "Choose your account type" : "Create your account"}</h1>
            <p>{step === 1 ? "Select the role that best fits your needs" : `Setting up your ${roles.find(r => r.id === form.role)?.label} account`}</p>
          </div>

          {isRegistered ? (
            <div className={styles.registrationSuccess}>
              <div className={styles.successIconWrapper}>
                <ShieldCheck size={48} />
              </div>
              <h2>Registration Successful!</h2>
              <p>Your account has been created and is currently <strong>pending admin approval</strong>.</p>
              <p>You will be able to log in once an administrator reviews and approves your registration.</p>
              <button 
                onClick={() => navigate(routes.LOGIN)} 
                className="premium-button premium-button-primary auth-submit"
                style={{ marginTop: '2rem' }}
              >
                Go to Login
              </button>
            </div>
          ) : step === 1 ? (
            <div className="role-selection">
              {roles.map((role) => (
                <div 
                  key={role.id} 
                  className={`role-card ${form.role === role.id ? 'active' : ''}`}
                  onClick={() => handleRoleSelect(role.id)}
                >
                  <div className="role-icon-wrapper">{role.icon}</div>
                  <div className="role-text">
                    <h3>{role.label}</h3>
                    <p>{role.description}</p>
                  </div>
                  <ChevronRight className={styles.roleArrow} size={20} />
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.authForm}>
              {error && <div className={styles.errorMessage}>{error}</div>}
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Full Name</label>
                  <div className={styles.inputWrapper}>
                    <User size={18} className={styles.inputIcon} />
                    <input
                      type="text"
                      name="name"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Mobile Number</label>
                  <div className="input-wrapper">
                    <Phone size={18} className="input-icon" />
                    <input
                      type="tel"
                      name="mobile"
                      placeholder="9876543210"
                      value={form.mobile}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Email Address</label>
                <div className={styles.inputWrapper}>
                  <Mail size={18} className={styles.inputIcon} />
                  <input
                    type="email"
                    name="email"
                    placeholder="john@company.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {form.role === "B2B_CUSTOMER" && (
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Company Name</label>
                    <div className={styles.inputWrapper}>
                      <Building2 size={18} className={styles.inputIcon} />
                      <input
                        type="text"
                        name="companyName"
                        placeholder="Acme Corp"
                        value={form.companyName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>GST Number (Optional)</label>
                    <div className={styles.inputWrapper}>
                      <ShieldCheck size={18} className={styles.inputIcon} />
                      <input
                        type="text"
                        name="gstNumber"
                        placeholder="29AAAAA0000A1Z5"
                        value={form.gstNumber}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {form.role === "DELIVERY_PARTNER" && (
                <div className={styles.formGroup}>
                  <label>Vehicle Type</label>
                  <div className={styles.inputWrapper}>
                    <Truck size={18} className={styles.inputIcon} />
                    <select
                      name="vehicleType"
                      value={form.vehicleType}
                      onChange={handleChange}
                      required
                      className="premium-select"
                    >
                      <option value="">Select vehicle type</option>
                      <option value="bike">Bike</option>
                      <option value="mini_truck">Mini Truck</option>
                      <option value="heavy_truck">Heavy Truck</option>
                    </select>
                  </div>
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Password</label>
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

              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Complete Registration"}
              </button>
            </form>
          )}

          <div className={styles.authFooterText}>
            Already have an account? <Link to={routes.LOGIN}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;