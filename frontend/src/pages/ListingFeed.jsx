import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client.js";

function formatPrice(minorUnits, currency) {
  return `${currency} ${(minorUnits / 100).toFixed(2)}`;
}

export default function ListingFeed() {
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [listings, setListings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/categories")
      .then(setCategories)
      .catch((err) => setError(err.message));
  }, []);

  async function runSearch(e) {
    e?.preventDefault();
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      const result = await apiFetch(`/listings/search?${params.toString()}`);
      setListings(result.listings);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main>
      <h1>BazaarHub</h1>
      <form onSubmit={runSearch}>
        <input
          type="search"
          placeholder="Search listings"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit">Search</button>
      </form>

      {error && <p role="alert">{error}</p>}

      <ul>
        {listings.map((listing) => (
          <li key={listing.id}>
            <Link to={`/listings/${listing.id}`}>{listing.title}</Link>
            {" — "}
            {formatPrice(listing.priceMinorUnits, listing.currency)}
          </li>
        ))}
      </ul>
    </main>
  );
}
