import { useWishlist } from "./hooks/useWishlist";
import WishlistItem from "./components/WishlistItem";

const Wishlist = () => {
  const { items, loading, removeItem } = useWishlist();

  if (loading) return <p>Loading wishlist...</p>;

  return (
    <div>
      <h1>Wishlist</h1>

      {items.length === 0 && <p>No items saved</p>}

      {items.map((item) => (
        <WishlistItem
          key={item.id}
          item={item}
          onRemove={removeItem}
        />
      ))}
    </div>
  );
};

export default Wishlist;