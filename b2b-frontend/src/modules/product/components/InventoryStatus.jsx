const InventoryStatus = ({ stock }) => {
  if (stock > 10) return <span style={{ color: "green" }}>In Stock</span>;
  if (stock > 0) return <span style={{ color: "orange" }}>Low Stock</span>;
  return <span style={{ color: "red" }}>Out of Stock</span>;
};

export default InventoryStatus;