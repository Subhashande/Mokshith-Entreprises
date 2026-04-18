import { useSettings } from "./hooks/useSettings";
import SettingsForm from "./components/SettingsForm";

const SettingsPage = () => {
  const { settings, loading, error, updateSettings } = useSettings();

  if (loading) return <p>Loading settings...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Settings</h1>

      <SettingsForm settings={settings} onSave={updateSettings} />
    </div>
  );
};

export default SettingsPage;