import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";

const FeatureAndSecurityPanel = ({ config, onSave }) => {
  const defaultFlags = {
    creditSystem: true,
    cod: true,
    notifications: true,
    reviews: true,
    recommendations: true,
    dynamicPricing: false
  };

  const featureFlags = config?.featureFlags || defaultFlags;

  const handleToggleFeature = (feature) => {
    const newFlags = { ...featureFlags, [feature]: !featureFlags[feature] };
    onSave({ featureFlags: newFlags });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
      <Card>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Feature Flags</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {Object.entries(featureFlags).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
              <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                <input 
                  type="checkbox" 
                  checked={value} 
                  onChange={() => handleToggleFeature(key)}
                  style={{ opacity: 0, width: 0, height: 0 }} 
                />
                <span style={{ 
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                  backgroundColor: value ? 'var(--primary)' : '#ccc', transition: '.4s', borderRadius: '20px' 
                }}>
                  <span style={{ 
                    position: 'absolute', height: '16px', width: '16px', left: value ? '22px' : '2px', bottom: '2px', 
                    backgroundColor: 'white', transition: '.4s', borderRadius: '50%' 
                  }}></span>
                </span>
              </label>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Security Panel</h3>
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Recent Login Attempts</p>
          <div style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
            <p style={{ marginBottom: '0.25rem' }}>• user1@example.com - <span style={{ color: 'var(--success)' }}>SUCCESS</span> (2 mins ago)</p>
            <p style={{ marginBottom: '0.25rem' }}>• unknown@hacker.com - <span style={{ color: 'var(--error)' }}>FAILED</span> (15 mins ago)</p>
            <p>• admin@mokshith.com - <span style={{ color: 'var(--success)' }}>SUCCESS</span> (1 hour ago)</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button size="small" variant="secondary" style={{ flex: 1 }}>Block IP List</Button>
          <Button size="small" variant="secondary" style={{ flex: 1 }}>View Logs</Button>
        </div>
      </Card>
    </div>
  );
};

export default FeatureAndSecurityPanel;
