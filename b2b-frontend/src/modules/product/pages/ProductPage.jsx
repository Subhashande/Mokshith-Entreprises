import { useProduct } from "../hooks/useProduct";
import VariantSelector from "../components/VariantSelector";
import BulkPricingTable from "../components/BulkPricingTable";
import InventoryStatus from "../components/InventoryStatus";
import { useState } from "react";

const ProductPage = () => {
  const { products, loading, error } = useProduct();
  const [selectedVariant, setSelectedVariant] = useState(null);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Products</h1>

      {products.map((product) => (
        <div key={product.id}>
          <h2>{product.name}</h2>

          <VariantSelector
            variants={product.variants}
            onSelect={setSelectedVariant}
          />

          {selectedVariant && (
            <InventoryStatus stock={selectedVariant.stock} />
          )}

          <BulkPricingTable pricing={product.bulkPricing} />
        </div>
      ))}
    </div>
  );
};

export default ProductPage;