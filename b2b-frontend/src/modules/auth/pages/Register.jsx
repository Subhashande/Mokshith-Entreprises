import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Card from "../../../components/ui/Card";
import { routes } from "../../../routes/routeConfig";
import { authService } from "../services/authService";

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    companyName: "",
    fullName: "",
    email: "",
    phone: "",
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
    setLoading(true);
    setError("");
    
    try {
      await authService.register(form);
      navigate(routes.LOGIN);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '2rem'
    }}>
      <div style={{ width: '100%', maxWidth: '500px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '800', 
            color: 'var(--text-main)',
            marginBottom: '0.5rem'
          }}>
            Join Mokshith B2B
          </h1>
          <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>
            Scale your business with our procurement platform
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                label="Company Name"
                name="companyName"
                placeholder="Enter company"
                value={form.companyName}
                onChange={handleChange}
                required
              />
              <Input
                label="Full Name"
                name="fullName"
                placeholder="Your name"
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </div>
            
            <Input
              label="Email Address"
              type="email"
              name="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={handleChange}
              required
            />

            <Input
              label="Phone Number"
              type="tel"
              name="phone"
              placeholder="+91 XXXXX XXXXX"
              value={form.phone}
              onChange={handleChange}
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />

            {error && (
              <div style={{ 
                padding: '0.75rem', 
                backgroundColor: '#fef2f2', 
                border: '1px solid #fee2e2', 
                borderRadius: 'var(--radius-md)',
                color: 'var(--error)',
                fontSize: '0.875rem',
                marginBottom: '1.5rem'
              }}>
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div style={{ 
            marginTop: '1.5rem', 
            textAlign: 'center', 
            fontSize: '0.875rem',
            color: 'var(--text-muted)'
          }}>
            Already have an account? {' '}
            <a href="/login" style={{ fontWeight: '600' }}>
              Sign In
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Register;
