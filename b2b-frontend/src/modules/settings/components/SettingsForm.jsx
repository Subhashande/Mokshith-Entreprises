import { useState, useEffect } from "react";

const SettingsForm = ({ settings, onSave }) => {
  const [form, setForm] = useState(settings || {});

  useEffect(() => {
    setForm(settings || {});
  }, [settings]);

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
      <h3>Account Settings</h3>

      <label>
        Name:
        <input
          name="name"
          value={form.name || ""}
          onChange={handleChange}
        />
      </label>

      <br />

      <label>
        Email:
        <input
          name="email"
          value={form.email || ""}
          onChange={handleChange}
        />
      </label>

      <br />

      <label>
        Notifications:
        <input
          type="checkbox"
          name="notifications"
          checked={form.notifications || false}
          onChange={handleChange}
        />
      </label>

      <br />

      <button type="submit">Save</button>
    </form>
  );
};

export default SettingsForm;