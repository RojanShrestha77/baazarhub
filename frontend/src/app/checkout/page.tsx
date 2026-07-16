"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Cart, CheckoutResult } from "@/types";
import { formatPrice } from "@/types";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    api.get<Cart>("/cart").then(setCart).catch(() => router.push("/cart"));
  }, [user, router]);

  if (!cart) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" role="status"><span className="sr-only">Loading...</span></div></div>;

  const availableItems = cart.items.filter((i) => i.available);
  const totalMinorUnits = availableItems.reduce((sum, i) => sum + (i.lineTotalMinorUnits || 0), 0);

  const handleCheckout = async () => {
    setSubmitting(true);
    try {
      const orders: CheckoutResult[] = [];
      for (const item of availableItems) {
        const result = await api.post<CheckoutResult>("/escrow/checkout", {
          listingId: item.listingId,
          quantity: item.quantity,
        });
        orders.push(result);
      }
      toast.success(`${orders.length} order(s) placed!`);
      router.push("/orders");
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div className="space-y-3">
            {availableItems.map((item) => (
              <div key={item.listingId} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.title} × {item.quantity}</span>
                <span className="font-medium">{formatPrice(item.lineTotalMinorUnits || 0)}</span>
              </div>
            ))}
          </div>
          <hr className="my-4 border-gray-100" />
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-indigo-600">{formatPrice(totalMinorUnits)}</span>
          </div>
        </div>
        <div className="bg-indigo-50 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-indigo-900">Your payment is held in escrow until you confirm delivery. You are fully protected.</p>
        </div>
        <button onClick={handleCheckout} disabled={submitting || availableItems.length === 0} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
          {submitting ? "Processing..." : `Place Order — ${formatPrice(totalMinorUnits)}`}
        </button>
      </motion.div>
    </div>
  );
}
