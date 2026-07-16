import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client.js";

export default function CreateListing() {
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch("/categories")
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0) setCategory(cats[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      // Price is entered as rupees in the form, converted to integer
      // minor units before it ever reaches the API — the server never
      // accepts or trusts a float.
      const priceMinorUnits = Math.round(Number(price) * 100);
      const listing = await apiFetch("/listings", {
        method: "POST",
        body: { title, description, priceMinorUnits, category },
      });
      navigate(`/listings/${listing.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main>
      <h1>New listing</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={4000}
          />
        </label>
        <label>
          Price (NPR)
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Create listing</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
