import { useOffers } from "./hooks/useOffers";
import OfferCard from "./components/OfferCard";

const OffersPage = () => {
  const { offers, loading, error } = useOffers();

  if (loading) return <p>Loading offers...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Offers & Promotions</h1>

      {offers.length === 0 && <p>No active offers</p>}

      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} />
      ))}
    </div>
  );
};

export default OffersPage;