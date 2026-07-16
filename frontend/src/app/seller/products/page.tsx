"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Trash2, ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";
import type { Listing } from "@/types";
import toast from "react-hot-toast";

export default function SellerProductsPage() {
  const [products, setProducts] = useState<Listing[]>([]);

  useEffect(() => {
    api.get("/listings/search?mine=true").then((data) => setProducts(data as Listing[])).catch(() => {});
  }, []);

  const remove = async (id: string) => {
    try { await api.delete(`/listings/${id}`); setProducts(products.filter((p) => p._id !== id)); toast.success("Deleted"); } catch { toast.error("Failed"); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Products</h1>
        <Link href="/listings/new" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New
        </Link>
      </div>
      <div className="space-y-3">
        {products.map((p, i) => (
          <motion.div key={p._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-indigo-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{p.title}</p>
              <p className="text-sm text-gray-500">${p.price.toFixed(2)}</p>
            </div>
            <Link href={`/listings/${p._id}`} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View</Link>
            <button onClick={() => remove(p._id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
