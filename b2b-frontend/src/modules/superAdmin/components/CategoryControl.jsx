import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";

const CategoryControl = ({ categories }) => {
  return (
    <Card style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Category Control</h3>
        <Button size="small">Create Category</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        {categories.map((category) => (
          <Card key={category.id} style={{ padding: '1.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--primary-light)' }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--primary)' }}>{category.name}</h4>
            <div style={{ marginBottom: '1.5rem' }}>
              {category.subcategories.map((sub, index) => (
                <span key={index} style={{ 
                  display: 'inline-block', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '4px', 
                  backgroundColor: 'white', 
                  fontSize: '0.75rem', 
                  fontWeight: '600',
                  marginRight: '0.5rem',
                  marginBottom: '0.5rem',
                  border: '1px solid var(--border)'
                }}>
                  {sub}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button size="small" variant="secondary" style={{ flex: 1 }}>Edit</Button>
              <Button size="small" variant="secondary" style={{ flex: 1, color: 'var(--error)', borderColor: 'var(--error)' }}>Disable</Button>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
};

export default CategoryControl;
