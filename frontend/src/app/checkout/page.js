"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Shield } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get("/cart").then((data) => setItems(data.items || [])).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const handleCheckout = async () => {
    setProcessing(true);
    try {
      const data = await api.post("/cart/checkout", {});
      toast.success("Order placed! Payment is held in escrow.");
      router.push(`/orders/${data.orderId}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const total = items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);

  if (!user) return <div className="max-w-2xl mx-auto px-4 py-8 text-center text-gray-500">Sign in to checkout</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : items.length === 0 ? (
        <div className="text-center py-12"><p className="text-gray-500 mb-4">Your cart is empty</p><Link href="/marketplace" className="text-indigo-600 hover:underline">Browse marketplace</Link></div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4 text-green-700 bg-green-50 rounded-lg p-3">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">Your payment is protected by escrow. Seller gets paid only after you confirm delivery.</span>
            </div>
            {items.map((item) => (
              <div key={item.listingId} className="flex justify-between py-2 border-b last:border-0">
                <div><p className="font-medium">{item.title}</p><p className="text-sm text-gray-500">Qty: {item.quantity} × £{(item.price || 0).toFixed(2)}</p></div>
                <p className="font-semibold">£{((item.price || 0) * item.quantity).toFixed(2)}</p>
              </div>
            ))}
            <div className="flex justify-between pt-4 mt-2 border-t">
              <p className="font-bold text-lg">Total</p>
              <p className="font-bold text-lg">£{total.toFixed(2)}</p>
            </div>
          </div>
          <button onClick={handleCheckout} disabled={processing} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50">
            {processing ? "Processing..." : `Pay £${total.toFixed(2)} Securely`}
          </button>
        </div>
      )}
    </div>
  );
}
