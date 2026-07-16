import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api/client.js";

function formatPrice(minorUnits, currency) {
  return `${currency} ${(minorUnits / 100).toFixed(2)}`;
}

// Listing title/description are attacker-reachable content — any seller
// can set them to anything. This component renders them as plain React
// children ONLY. No dangerouslySetInnerHTML, no markdown renderer, no
// href built from listing content — React's default escaping is the
// entire XSS defense here, not a sanitizer bolted on afterward. See
// docs/security-decisions.md and tests/xss.test.jsx.
export default function ListingDetail() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState(null);
  const [addStatus, setAddStatus] = useState(null);

  useEffect(() => {
    apiFetch(`/listings/${id}`)
      .then(setListing)
      .catch((err) => setError(err.message));
  }, [id]);

  async function addToCart() {
    setAddStatus(null);
    try {
      await apiFetch("/cart/items", { method: "POST", body: { listingId: id, quantity: 1 } });
      setAddStatus("Added to cart.");
    } catch (err) {
      setAddStatus(err.message);
    }
  }

  if (error) return <p role="alert">{error}</p>;
  if (!listing) return <p>Loading…</p>;

  return (
    <main>
      <h1>{listing.title}</h1>
      <p>{formatPrice(listing.priceMinorUnits, listing.currency)}</p>
      <p>{listing.description}</p>
      <div>
        {listing.images.map((filename) => (
          <img
            key={filename}
            src={`/api/listings/${listing.id}/images/${filename}`}
            alt={listing.title}
            width={200}
          />
        ))}
      </div>
      <button type="button" onClick={addToCart}>
        Add to cart
      </button>
      {addStatus && <p>{addStatus}</p>}
    </main>
  );
}
