import { useState, useEffect } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";

const collections = ["users", "products", "orders", "payments", "credit"];

const DbShell = ({ onFetchCollection, onClose }) => {
  const [activeCollection, setActiveCollection] = useState(collections[0]);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchData = async (collection) => {
    setLoading(true);
    try {
      const results = await onFetchCollection(collection);
      setData(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeCollection);
  }, [activeCollection]);

  const filteredData = data.filter((item) => 
    Object.values(item).some((val) => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', 
      alignItems: 'center', justifyContent: 'center', padding: '2rem' 
    }}>
      <Card style={{ width: '100%', maxWidth: '1000px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Database Shell Console</h2>
          <Button onClick={onClose} variant="secondary">Close</Button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {collections.map((coll) => (
              <Button 
                key={coll} 
                size="small" 
                variant={activeCollection === coll ? "primary" : "secondary"}
                onClick={() => setActiveCollection(coll)}
              >
                {coll}
              </Button>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <Input 
              placeholder="Search in collection..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#0f172a', borderRadius: 'var(--radius-md)', padding: '1rem', color: '#10b981', fontFamily: 'monospace' }}>
          {loading ? (
            <p>Querying collection {activeCollection}...</p>
          ) : (
            <pre style={{ margin: 0 }}>
              {JSON.stringify(filteredData, null, 2)}
            </pre>
          )}
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          <p>Total records: {filteredData.length}</p>
          <p>Status: Ready</p>
        </div>
      </Card>
    </div>
  );
};

export default DbShell;
