const WishlistItem = ({ item, onRemove }) => {
  return (
    <div style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
      <p>{item.name}</p>
      <small>₹{item.price}</small>

      <br />

      <button onClick={() => onRemove(item.id)}>Remove</button>
    </div>
  );
};

export default WishlistItem;