"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Plus, ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Listing } from "@/types";

export default function MarketplaceClient() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/listings/search").then((data) => setListings(data as Listing[])).catch(() => {});
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    api.get(`/listings/search?q=${encodeURIComponent(search)}`).then((data) => setListings(data as Listing[])).catch(() => {});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
        {user && (
          <Link href="/listings/new" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Create Listing
          </Link>
        )}
      </div>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search listings..." className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white shadow-sm" />
        </div>
      </form>

      <motion.div initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {listings.map((item, i) => (
          <motion.div key={item._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={`/listings/${item._id}`} className="block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
              <div className="aspect-[4/3] bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                <ShoppingBag className="w-12 h-12 text-indigo-300 group-hover:scale-110 transition-transform" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                <p className="text-xs text-gray-400 mt-1 capitalize">{item.category}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-bold text-indigo-600">${item.price.toFixed(2)}</span>
                  <span className="text-xs text-gray-400 capitalize">{item.condition.replace("_", " ")}</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
