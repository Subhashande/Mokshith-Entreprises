import { useState, useEffect } from "react";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";

const SystemConfigForm = ({ config, onSave }) => {
  const [form, setForm] = useState(config || {});

  useEffect(() => {
    setForm(config || {});
  }, [config]);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Card style={{ marginBottom: '2.5rem' }}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>System Configuration</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '700', color: form.maintenanceMode ? 'var(--error)' : 'var(--success)' }}>
              Maintenance Mode: {form.maintenanceMode ? 'ON' : 'OFF'}
            </span>
            <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
              <input 
                type="checkbox" 
                name="maintenanceMode"
                checked={form.maintenanceMode || false} 
                onChange={handleChange}
                style={{ opacity: 0, width: 0, height: 0 }} 
              />
              <span style={{ 
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                backgroundColor: form.maintenanceMode ? 'var(--error)' : '#ccc', transition: '.4s', borderRadius: '20px' 
              }}>
                <span style={{ 
                  position: 'absolute', height: '16px', width: '16px', left: form.maintenanceMode ? '22px' : '2px', bottom: '2px', 
                  backgroundColor: 'white', transition: '.4s', borderRadius: '50%' 
                }}></span>
              </span>
            </label>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <Input
            label="Site Name"
            name="siteName"
            value={form.siteName || ""}
            onChange={handleChange}
          />
          <Input
            label="Support Email"
            name="supportEmail"
            type="email"
            value={form.supportEmail || ""}
            onChange={handleChange}
          />
          <Input
            label="Default Currency"
            name="defaultCurrency"
            value={form.defaultCurrency || "INR"}
            onChange={handleChange}
          />
          <Input
            label="Commission Rate (%)"
            name="commissionRate"
            type="number"
            value={form.commissionRate || 5}
            onChange={handleChange}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <Input
            label="Order Cutoff Time"
            name="orderCutoffTime"
            type="time"
            value={form.orderCutoffTime || "18:00"}
            onChange={handleChange}
          />
          <Input
            label="Max Credit Limit"
            name="maxCreditLimit"
            type="number"
            value={form.maxCreditLimit || 1000000}
            onChange={handleChange}
          />
        </div>

        <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              name="allowRegistration"
              checked={form.allowRegistration || false}
              onChange={handleChange}
              style={{ accentColor: 'var(--primary)' }}
            />
            Allow New Registrations
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              name="enableCOD"
              checked={form.enableCOD || false}
              onChange={handleChange}
              style={{ accentColor: 'var(--primary)' }}
            />
            Enable COD
          </label>
        </div>

        <Button type="submit">Save Configurations</Button>
      </form>
    </Card>
  );
};

export default SystemConfigForm;
