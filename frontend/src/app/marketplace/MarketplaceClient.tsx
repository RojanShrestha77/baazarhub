"use client";

import { useState, useEffect, FormEvent, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Plus, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { SearchResult, SerializedListing, Category } from "@/types";
import { formatPrice } from "@/types";

export default function MarketplaceClient() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [listings, setListings] = useState<SerializedListing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    api.get<Category[]>("/categories").then(setCategories).catch(() => {});
  }, []);

  const fetchListings = useCallback(async (p: number) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("limit", String(limit));
    if (search) params.set("q", search);
    if (category) params.set("category", category);
    if (minPrice) params.set("minPrice", String(Number(minPrice) * 100));
    if (maxPrice) params.set("maxPrice", String(Number(maxPrice) * 100));
    try {
      const data = await api.get<SearchResult>(`/listings/search?${params}`);
      setListings(data.listings);
      setTotal(data.total);
      setPage(data.page);
    } catch { /* ignore */ }
  }, [search, category, minPrice, maxPrice, limit]);

  useEffect(() => { fetchListings(1); }, [fetchListings]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    fetchListings(1);
  };

  const totalPages = Math.ceil(total / limit);

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

      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative max-w-xl">
          <label htmlFor="search-input" className="sr-only">Search listings</label>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input id="search-input" type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search listings..." className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm" />
        </div>
      </form>

      <button onClick={() => setShowFilters(!showFilters)} className="text-sm text-indigo-600 hover:text-indigo-700 mb-4 font-medium">
        {showFilters ? "Hide filters" : "Show filters"}
      </button>

      {showFilters && (
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <label htmlFor="cat-filter" className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select id="cat-filter" value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
              <option value="">All</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="min-price" className="block text-xs font-medium text-gray-500 mb-1">Min Price (NPR)</label>
            <input id="min-price" type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0" />
          </div>
          <div>
            <label htmlFor="max-price" className="block text-xs font-medium text-gray-500 mb-1">Max Price (NPR)</label>
            <input id="max-price" type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Any" />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={() => fetchListings(1)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">Apply</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {listings.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={`/listings/${item.id}`} className="block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
              <div className="aspect-[4/3] bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                {item.images.length > 0 ? (
                  <img src={`${API_BASE}/listings/${item.id}/images/${item.images[0]}`} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag className="w-12 h-12 text-indigo-300 group-hover:scale-110 transition-transform" />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                <p className="text-xs text-gray-400 mt-1">{item.category}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-bold text-indigo-600">{formatPrice(item.priceMinorUnits)}</span>
                  <span className="text-xs text-gray-400">{item.status}</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button onClick={() => fetchListings(page - 1)} disabled={page <= 1} className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button onClick={() => fetchListings(page + 1)} disabled={page >= totalPages} className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
