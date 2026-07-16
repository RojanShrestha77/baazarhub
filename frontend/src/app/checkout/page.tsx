"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CartItem } from "@/types";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    api.get("/cart").then((data) => setItems(data as CartItem[])).catch(() => {});
  }, [user, router]);

  const total = items.reduce((sum, item) => sum + item.listing.price * item.quantity, 0);

  const handleCheckout = async () => {
    setSubmitting(true);
    try {
      await api.post("/cart/checkout");
      toast.success("Order placed!");
      router.push("/orders");
    } catch {
      toast.error("Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item._id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.listing.title} × {item.quantity}</span>
                <span className="font-medium">${(item.listing.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <hr className="my-4 border-gray-100" />
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-indigo-600">${total.toFixed(2)}</span>
          </div>
        </div>
        <div className="bg-indigo-50 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-600 mt-0.5" />
          <p className="text-sm text-indigo-900">Your payment is held in escrow until you confirm delivery. You are fully protected.</p>
        </div>
        <button onClick={handleCheckout} disabled={submitting || items.length === 0} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
          {submitting ? "Processing..." : `Pay $${total.toFixed(2)}`}
        </button>
      </motion.div>
    </div>
  );
}
