const RouteMap = ({ route }) => {
  return (
    <div style={{ border: "1px solid #ccc", padding: "10px" }}>
      <h4>Route Map</h4>

      {route.map((point, index) => (
        <div key={index}>
          📍 Lat: {point.lat}, Lng: {point.lng}
        </div>
      ))}
    </div>
  );
};

export default RouteMap;