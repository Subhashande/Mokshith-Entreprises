import { useState } from "react";

const VariantSelector = ({ variants, onSelect }) => {
  const [selected, setSelected] = useState(null);

  const handleSelect = (variant) => {
    setSelected(variant.id);
    onSelect(variant);
  };

  return (
    <div>
      {variants.map((v) => (
        <button
          key={v.id}
          onClick={() => handleSelect(v)}
          style={{
            background: selected === v.id ? "blue" : "gray",
            color: "#fff",
          }}
        >
          {v.name}
        </button>
      ))}
    </div>
  );
};

export default VariantSelector;