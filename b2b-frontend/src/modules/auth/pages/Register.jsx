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
    <div className="auth-container">
      <div className="auth-sidebar">
        <div className="sidebar-content">
          <Link to={routes.LANDING} className="sidebar-logo">
            <span className="logo-text">Mokshith</span>
            <span className="logo-badge">B2B</span>
          </Link>
          <div className="sidebar-features">
            <div className="feature-item">
              <div className="feature-icon"><ShieldCheck size={20} /></div>
              <div>
                <h4>Secure Transactions</h4>
                <p>Enterprise-grade security for all your business deals.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Briefcase size={20} /></div>
              <div>
                <h4>Business Tools</h4>
                <p>Advanced analytics and inventory management.</p>
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
          {step === 2 && (
            <button className="back-button" onClick={() => setStep(1)}>
              <ArrowLeft size={18} /> <span>Back to roles</span>
            </button>
          )}

          <div className="auth-header">
            <h1>{step === 1 ? "Choose your account type" : "Create your account"}</h1>
            <p>{step === 1 ? "Select the role that best fits your needs" : `Setting up your ${roles.find(r => r.id === form.role)?.label} account`}</p>
          </div>

          {isRegistered ? (
            <div className="registration-success">
              <div className="success-icon-wrapper">
                <ShieldCheck size={48} className="text-green-500" />
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
                  <ChevronRight className="role-arrow" size={20} />
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <div className="input-wrapper">
                    <User size={18} className="input-icon" />
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

              <div className="form-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
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
                <div className="form-grid">
                  <div className="form-group">
                    <label>Company Name</label>
                    <div className="input-wrapper">
                      <Building2 size={18} className="input-icon" />
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
                  <div className="form-group">
                    <label>GST Number</label>
                    <div className="input-wrapper">
                      <ShieldCheck size={18} className="input-icon" />
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
                <div className="form-group">
                  <label>Vehicle Type</label>
                  <div className="input-wrapper">
                    <Truck size={18} className="input-icon" />
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

              <div className="form-group">
                <label>Password</label>
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

              <button 
                type="submit" 
                className="premium-button premium-button-primary auth-submit"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Complete Registration"}
              </button>
            </form>
          )}

          <div className="auth-footer-text">
            Already have an account? <Link to={routes.LOGIN}>Sign in</Link>
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
          overflow-y: auto;
        }

        .auth-form-wrapper {
          width: 100%;
          max-width: 560px;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: none;
          color: var(--text-muted);
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 2rem;
          transition: var(--transition-fast);
        }

        .back-button:hover {
          color: var(--primary);
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

        .role-selection {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .role-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.5rem;
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .role-card:hover {
          border-color: var(--primary);
          background-color: var(--primary-light);
          transform: translateY(-2px);
        }

        .role-icon-wrapper {
          width: 3.5rem;
          height: 3.5rem;
          background: #f1f5f9;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          transition: all 0.2s ease;
        }

        .role-card:hover .role-icon-wrapper {
          background: white;
        }

        .role-text {
          flex: 1;
        }

        .role-text h3 {
          font-size: 1.125rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .role-text p {
          color: var(--text-muted);
          font-size: 0.9375rem;
        }

        .role-arrow {
          color: var(--border);
          transition: all 0.2s ease;
        }

        .role-card:hover .role-arrow {
          color: var(--primary);
          transform: translateX(4px);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
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

        .input-wrapper input, .premium-select {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 3rem;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          font-size: 0.9375rem;
          transition: var(--transition-fast);
          background-color: #f8fafc;
        }

        .input-wrapper input:focus, .premium-select:focus {
          border-color: var(--primary);
          background-color: white;
          outline: none;
          box-shadow: 0 0 0 4px var(--primary-light);
        }

        .premium-select {
          padding-left: 3rem;
          appearance: none;
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

        .registration-success {
          text-align: center;
          padding: 2rem 0;
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .success-icon-wrapper {
          width: 80px;
          height: 80px;
          background-color: #f0fdf4;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
        }

        .registration-success h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 1rem;
        }

        .registration-success p {
          color: var(--text-muted);
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }

        @media (max-width: 992px) {
          .auth-sidebar {
            display: none;
          }
          .auth-main {
            padding: 2rem;
          }
        }

        @media (max-width: 576px) {
          .form-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Register;