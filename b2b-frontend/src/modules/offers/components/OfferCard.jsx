const OfferCard = ({ offer }) => {
  return (
    <div style={{ border: "1px solid #ddd", padding: "10px", marginBottom: "10px" }}>
      <h3>{offer.title}</h3>
      <p>{offer.description}</p>

      <p>
        Discount: <strong>{offer.discount}%</strong>
      </p>

      <small>
        Valid Till: {new Date(offer.validTill).toLocaleDateString()}
      </small>
    </div>
  );
};

export default OfferCard;