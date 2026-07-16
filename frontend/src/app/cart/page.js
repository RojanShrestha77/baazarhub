"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";

export default function CartPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get("/cart").then((data) => setItems(data.items || [])).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const updateQty = async (listingId, qty) => {
    try {
      await api.patch(`/cart/items/${listingId}`, { quantity: qty });
      setItems((prev) => prev.map((i) => i.listingId === listingId ? { ...i, quantity: qty } : i));
    } catch (err) { toast.error(err.message); }
  };

  const removeItem = async (listingId) => {
    try {
      await api.delete(`/cart/items/${listingId}`);
      setItems((prev) => prev.filter((i) => i.listingId !== listingId));
      toast.success("Removed from cart");
    } catch (err) { toast.error(err.message); }
  };

  const total = items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);

  if (!user) return <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">Sign in to view your cart</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : items.length === 0 ? (
        <div className="text-center py-12"><p className="text-gray-500 mb-4">Your cart is empty</p><Link href="/marketplace" className="text-indigo-600 hover:underline">Browse marketplace</Link></div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.listingId} className="bg-white border rounded-lg p-4 flex items-center gap-4">
              <div className="flex-1"><Link href={`/listings/${item.listingId}`} className="font-semibold hover:text-indigo-600">{item.title}</Link><p className="text-sm text-gray-500">£{(item.price || 0).toFixed(2)} each</p></div>
              <input type="number" min="1" value={item.quantity} onChange={(e) => updateQty(item.listingId, parseInt(e.target.value) || 1)} className="w-16 border rounded px-2 py-1 text-center" />
              <p className="font-semibold w-20 text-right">£{((item.price || 0) * item.quantity).toFixed(2)}</p>
              <button onClick={() => removeItem(item.listingId)} className="text-red-500 hover:text-red-700"><Trash2 className="w-5 h-5" /></button>
            </div>
          ))}
          <div className="bg-white border rounded-lg p-4 flex items-center justify-between">
            <p className="text-lg font-bold">Total: £{total.toFixed(2)}</p>
            <Link href="/checkout" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">Checkout</Link>
          </div>
        </div>
      )}
    </div>
  );
}
