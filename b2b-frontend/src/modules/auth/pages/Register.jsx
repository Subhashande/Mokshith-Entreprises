import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { routes } from "../../../routes/routeConfig";
import { authService } from "../services/authService";
import { useAuth } from "../hooks/useAuth";
import { registerSchema } from "../../../validations/schemas";
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
  const [step, setStep] = useState(1);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "B2B_CUSTOMER",
    },
  });

  const selectedRole = watch('role');

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

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(routes.DASHBOARD);
    }
  }, [user, navigate]);

  const handleRoleSelect = (roleId) => {
    setValue('role', roleId);
    setStep(2);
  };

  const onSubmit = async (data) => {
    setError("");
    
    try {
      // Transform data to match API expectations
      const payload = {
        ...data,
        mobile: data.phone, // Map phone to mobile for API
      };
      delete payload.phone;
      delete payload.confirmPassword;
      
      await authService.register(payload);
      setIsRegistered(true);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
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
                <button
                  type="button"
                  key={role.id} 
                  className={`role-card ${selectedRole === role.id ? 'active' : ''}`}
                  onClick={() => handleRoleSelect(role.id)}
                  aria-pressed={selectedRole === role.id}
                  aria-label={`Select ${role.label} account type`}
                >
                  <div className="role-icon-wrapper" aria-hidden="true">{role.icon}</div>
                  <div className="role-text">
                    <h3>{role.label}</h3>
                    <p>{role.description}</p>
                  </div>
                  <ChevronRight className={styles.roleArrow} size={20} aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className={styles.authForm} noValidate>
              {error && (
                <div className={styles.errorMessage} role="alert" aria-live="polite">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="name">Full Name</label>
                  <div className={styles.inputWrapper}>
                    <User size={18} className={styles.inputIcon} aria-hidden="true" />
                    <input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      aria-label="Full name"
                      aria-invalid={errors.name ? 'true' : 'false'}
                      aria-describedby={errors.name ? 'name-error' : undefined}
                      {...register('name')}
                    />
                  </div>
                  {errors.name && (
                    <span id="name-error" className={styles.fieldError} role="alert">
                      {errors.name.message}
                    </span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="phone">Mobile Number</label>
                  <div className={styles.inputWrapper}>
                    <Phone size={18} className={styles.inputIcon} aria-hidden="true" />
                    <input
                      id="phone"
                      type="tel"
                      placeholder="9876543210"
                      aria-label="Mobile number"
                      aria-invalid={errors.phone ? 'true' : 'false'}
                      aria-describedby={errors.phone ? 'phone-error' : undefined}
                      {...register('phone')}
                    />
                  </div>
                  {errors.phone && (
                    <span id="phone-error" className={styles.fieldError} role="alert">
                      {errors.phone.message}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email">Email Address</label>
                <div className={styles.inputWrapper}>
                  <Mail size={18} className={styles.inputIcon} aria-hidden="true" />
                  <input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    aria-label="Email address"
                    aria-invalid={errors.email ? 'true' : 'false'}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <span id="email-error" className={styles.fieldError} role="alert">
                    {errors.email.message}
                  </span>
                )}
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="password">Password</label>
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

                <div className={styles.formGroup}>
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className={styles.inputWrapper}>
                    <Lock size={18} className={styles.inputIcon} aria-hidden="true" />
                    <input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      aria-label="Confirm password"
                      aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                      aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                      {...register('confirmPassword')}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <span id="confirm-password-error" className={styles.fieldError} role="alert">
                      {errors.confirmPassword.message}
                    </span>
                  )}
                </div>
              </div>

              {/* Role-specific Fields */}
              {selectedRole === "B2B_CUSTOMER" && (
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
