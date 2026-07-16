import { useEffect, useState } from "react";
import { apiFetch } from "../api/client.js";

function formatMoney(minorUnits) {
  return (minorUnits / 100).toFixed(2);
}

export default function Cart() {
  const [cart, setCart] = useState(null);
  const [error, setError] = useState(null);
  const [checkoutResult, setCheckoutResult] = useState(null);

  async function load() {
    try {
      setCart(await apiFetch("/cart"));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function removeItem(listingId) {
    await apiFetch(`/cart/items/${listingId}`, { method: "DELETE" });
    load();
  }

  async function checkout() {
    setCheckoutResult(null);
    try {
      const result = await apiFetch("/cart/checkout", { method: "POST" });
      setCheckoutResult(result);
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <p role="alert">{error}</p>;
  if (!cart) return <p>Loading…</p>;

  return (
    <main>
      <h1>Cart</h1>
      <ul>
        {cart.items.map((item) => (
          <li key={item.listingId}>
            {item.title || item.listingId} × {item.quantity}
            {item.available ? (
              <> — NPR {formatMoney(item.lineTotalMinorUnits)}</>
            ) : (
              <> — unavailable ({item.reason})</>
            )}
            <button type="button" onClick={() => removeItem(item.listingId)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <p>Total: NPR {formatMoney(cart.totalMinorUnits)}</p>
      <button type="button" onClick={checkout}>
        Checkout
      </button>
      {checkoutResult && (
        <p>{checkoutResult.ok ? "Ready to check out." : "Some items changed — review your cart."}</p>
      )}
    </main>
  );
}
