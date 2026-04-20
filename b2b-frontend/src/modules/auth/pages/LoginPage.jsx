import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useSelector } from "react-redux";
import { sanitizeInput } from "../../../utils/debounce";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Card from "../../../components/ui/Card";

const LoginPage = () => {
  const { login, loading, error } = useAuth();
  const { config } = useSelector((state) => state.superAdmin);

  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: sanitizeInput ? sanitizeInput(value) : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(form);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '1.5rem'
    }}>
      {config?.maintenanceMode && (
        <div style={{ 
          width: '100%', maxWidth: '440px', backgroundColor: 'var(--error)', 
          color: 'white', padding: '0.75rem', borderRadius: 'var(--radius-md)', 
          textAlign: 'center', marginBottom: '1.5rem', fontWeight: '700' 
        }}>
          🚧 System Under Maintenance
        </div>
      )}
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '800', 
            color: 'var(--text-main)',
            marginBottom: '0.5rem',
            letterSpacing: '-0.025em'
          }}>
            Mokshith Enterprises
          </h1>
          <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>
            B2B Procurement Solutions
          </p>
        </div>

        <Card>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem' }}>Welcome back</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Sign in to manage your orders</p>
          </div>

          <form onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="text"
              name="identifier"
              placeholder="name@company.com"
              value={form.identifier}
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

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '1.5rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: 'var(--primary)' }} />
                <span>Remember me</span>
              </label>
              <a href="/forgot-password" style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                Forgot password?
              </a>
            </div>

            <Button 
              type="submit" 
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div style={{ 
            marginTop: '1.5rem', 
            textAlign: 'center', 
            fontSize: '0.875rem',
            color: 'var(--text-muted)'
          }}>
            Don't have an account? {' '}
            <a href="/register" style={{ fontWeight: '600' }}>
              Contact Sales
            </a>
          </div>
        </Card>

        <p style={{ 
          textAlign: 'center', 
          marginTop: '2rem', 
          fontSize: '0.75rem', 
          color: 'var(--text-muted)' 
        }}>
          &copy; 2026 Mokshith Enterprises. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
