"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trash2, ShoppingCart } from "lucide-react";
import { api } from "@/lib/api";
import type { CartItem } from "@/types";
import toast from "react-hot-toast";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    api.get("/cart").then((data) => setItems(data as CartItem[])).catch(() => {});
  }, []);

  const total = items.reduce((sum, item) => sum + item.listing.price * item.quantity, 0);

  const updateQty = async (id: string, qty: number) => {
    if (qty < 1) return;
    try { await api.patch(`/cart/${id}`, { quantity: qty }); setItems(items.map((i) => i._id === id ? { ...i, quantity: qty } : i)); } catch { toast.error("Failed to update"); }
  };

  const removeItem = async (id: string) => {
    try { await api.delete(`/cart/${id}`); setItems(items.filter((i) => i._id !== id)); toast.success("Removed"); } catch { toast.error("Failed to remove"); }
  };

  if (items.length === 0) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <ShoppingCart className="w-16 h-16 text-gray-300" />
      <p className="text-gray-500 text-lg">Your cart is empty</p>
      <Link href="/marketplace" className="text-indigo-600 font-medium hover:text-indigo-700">Browse marketplace</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
      <div className="space-y-4">
        {items.map((item) => (
          <motion.div key={item._id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-8 h-8 text-indigo-300" />
            </div>
            <div className="flex-1 min-w-0">
              <Link href={`/listings/${item.listing._id}`} className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors truncate block">{item.listing.title}</Link>
              <p className="text-sm text-gray-500">${item.listing.price.toFixed(2)} each</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => updateQty(item._id, item.quantity - 1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">-</button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <button onClick={() => updateQty(item._id, item.quantity + 1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">+</button>
            </div>
            <div className="text-right min-w-[80px]">
              <p className="font-semibold text-gray-900">${(item.listing.price * item.quantity).toFixed(2)}</p>
            </div>
            <button onClick={() => removeItem(item._id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
          </motion.div>
        ))}
      </div>
      <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-semibold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-indigo-600">${total.toFixed(2)}</span>
        </div>
        <Link href="/checkout" className="block w-full bg-indigo-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm">Proceed to Checkout</Link>
      </div>
    </div>
  );
}
