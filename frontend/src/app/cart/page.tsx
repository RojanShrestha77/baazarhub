"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trash2, ShoppingCart, Minus, Plus } from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import type { Cart, ResolvedCartItem } from "@/types";
import { formatPrice } from "@/types";
import toast from "react-hot-toast";

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    try {
      const data = await api.get<Cart>("/cart");
      setCart(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCart(); }, []);

  const updateQty = async (listingId: string, qty: number) => {
    if (qty < 1) return;
    try {
      await api.patch(`/cart/items/${listingId}`, { quantity: qty });
      await fetchCart();
    } catch { toast.error("Failed to update"); }
  };

  const removeItem = async (listingId: string) => {
    try {
      await api.delete(`/cart/items/${listingId}`);
      await fetchCart();
      toast.success("Removed");
    } catch { toast.error("Failed to remove"); }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" role="status"><span className="sr-only">Loading...</span></div></div>;

  const availableItems = cart?.items.filter((i) => i.available) || [];
  const unavailableItems = cart?.items.filter((i) => !i.available) || [];

  if (cart && availableItems.length === 0 && unavailableItems.length === 0) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <ShoppingCart className="w-16 h-16 text-gray-300" />
      <p className="text-gray-500 text-lg">Your cart is empty</p>
      <Link href="/marketplace" className="text-indigo-600 font-medium hover:text-indigo-700">Browse marketplace</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      {unavailableItems.map((item) => (
        <div key={item.listingId} className="bg-red-50 rounded-2xl border border-red-100 p-4 mb-3 flex items-center gap-4">
          <div className="flex-1">
            <p className="font-medium text-red-800">{item.title || "Unavailable item"}</p>
            <p className="text-sm text-red-600">{item.reason || "No longer available"}</p>
          </div>
          <button onClick={() => removeItem(item.listingId)} className="p-2 text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5" /></button>
        </div>
      ))}

      <div className="space-y-4">
        {availableItems.map((item) => (
          <motion.div key={item.listingId} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
            <Link href={`/listings/${item.listingId}`} className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
              <ShoppingCart className="w-8 h-8 text-indigo-300" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/listings/${item.listingId}`} className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors truncate block">{item.title}</Link>
              <p className="text-sm text-gray-500">{item.unitPriceMinorUnits !== undefined ? formatPrice(item.unitPriceMinorUnits) : ""} each</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateQty(item.listingId, item.quantity - 1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors" aria-label="Decrease quantity"><Minus className="w-4 h-4" /></button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <button onClick={() => updateQty(item.listingId, item.quantity + 1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors" aria-label="Increase quantity"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="text-right min-w-[80px]">
              <p className="font-semibold text-gray-900">{item.lineTotalMinorUnits !== undefined ? formatPrice(item.lineTotalMinorUnits) : ""}</p>
            </div>
            <button onClick={() => removeItem(item.listingId)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" aria-label="Remove item"><Trash2 className="w-5 h-5" /></button>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-semibold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-indigo-600">{cart ? formatPrice(cart.totalMinorUnits) : "—"}</span>
        </div>
        <Link href="/checkout" className="block w-full bg-indigo-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}
