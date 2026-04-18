import { useAnalytics } from "../hooks/useAnalytics";
import KPIWidget from "../components/KPIWidget";
import Filters from "../components/Filters";

const AnalyticsPage = () => {
  const { data, filters, setFilters, loading, error } = useAnalytics();

  if (loading) return <p>Loading analytics...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Analytics Dashboard</h1>

      <Filters filters={filters} setFilters={setFilters} />

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {data.kpis.map((kpi, index) => (
          <KPIWidget key={index} label={kpi.label} value={kpi.value} />
        ))}
      </div>
    </div>
  );
};

export default AnalyticsPage;