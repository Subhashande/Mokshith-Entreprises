import { useState, useEffect } from "react";

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
    <form onSubmit={handleSubmit}>
      <h3>System Configuration</h3>

      <label>
        Maintenance Mode:
        <input
          type="checkbox"
          name="maintenanceMode"
          checked={form.maintenanceMode || false}
          onChange={handleChange}
        />
      </label>

      <br />

      <label>
        Max Users:
        <input
          type="number"
          name="maxUsers"
          value={form.maxUsers || 0}
          onChange={handleChange}
        />
      </label>

      <br />

      <button type="submit">Save</button>
    </form>
  );
};

export default SystemConfigForm;