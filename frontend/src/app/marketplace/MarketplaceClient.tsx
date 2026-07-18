"use client";

import { useState, useEffect, FormEvent, useCallback, Fragment } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Plus, ShoppingBag, ChevronLeft, ChevronRight, SlidersHorizontal, PackageOpen } from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { SearchResult, SerializedListing, Category } from "@/types";
import { formatPrice, buildCategoryTree } from "@/types";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Category[]>("/categories").then(setCategories).catch(() => {});
  }, []);

  const fetchListings = useCallback(async (p: number) => {
    setLoading(true);
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
    } catch { setListings([]); setTotal(0); }
    finally { setLoading(false); }
  }, [search, category, minPrice, maxPrice, limit]);

  useEffect(() => { fetchListings(1); }, [fetchListings]);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); fetchListings(1); };

  const totalPages = Math.ceil(total / limit);

  const activeFilterCount = [category, minPrice, maxPrice].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-sm text-gray-500 mt-1">{total > 0 ? `${total} listing${total !== 1 ? "s" : ""} found` : "Browse items from trusted sellers"}</p>
        </div>
        {user && (
          <Link href="/listings/new" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
            <Plus className="w-4 h-4" /> Create Listing
          </Link>
        )}
      </div>

      {/* Search + Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search listings..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-shadow" />
          </form>
          <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && <span className="bg-indigo-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{activeFilterCount}</span>}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-wrap items-end gap-4 pt-4 mt-4 border-t border-gray-100">
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full sm:w-44 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                <option value="">All Categories</option>
                {buildCategoryTree(categories).map((t) => (
                  <Fragment key={t.parent.id}>
                    <option value={t.parent.id}>{t.parent.name}</option>
                    {t.children.map((c) => <option key={c.id} value={c.id}>&nbsp;&nbsp;{c.name}</option>)}
                  </Fragment>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-0 sm:w-auto">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Price Range (NPR)</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full sm:w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Min" />
                <span className="text-gray-400">—</span>
                <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full sm:w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Max" />
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => fetchListings(1)} className="flex-1 sm:flex-none px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">Apply</button>
              <button onClick={() => { setCategory(""); setMinPrice(""); setMaxPrice(""); fetchListings(1); }} className="flex-1 sm:flex-none px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Clear</button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-gray-100" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-5 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && listings.length === 0 && (
        <div className="text-center py-20">
          <PackageOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No listings found</h3>
          <p className="text-sm text-gray-500 mb-6">{search || category || minPrice || maxPrice ? "Try adjusting your filters" : "Be the first to create a listing"}</p>
          {!user && <Link href="/listings/new" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors"><Plus className="w-4 h-4" /> Create Listing</Link>}
        </div>
      )}

      {/* Listing grid */}
      {!loading && listings.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {listings.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link href={`/listings/${item.id}`} className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-indigo-100 transition-all duration-200">
                  <div className="aspect-[4/3] bg-gradient-to-br from-indigo-50 to-purple-50 relative overflow-hidden">
                    {item.images.length > 0 ? (
                      <img src={`${API_BASE}/listings/${item.id}/images/${item.images[0]}`} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-12 h-12 text-indigo-200 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                    )}
                    {item.status === "sold" && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Sold</div>
                    )}
                    {item.status === "draft" && (
                      <div className="absolute top-2 left-2 bg-gray-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Draft</div>
                    )}
                    {item.status === "active" && item.quantity <= 3 && item.quantity > 0 && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Only {item.quantity} left</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                    <p className="text-xs text-gray-400 mt-1 truncate">{item.category || "General"}</p>
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="text-lg font-bold text-gray-900">{formatPrice(item.priceMinorUnits)}</span>
                      {item.quantity > 0 && <span className="text-xs text-gray-400">Qty: {item.quantity}</span>}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <button onClick={() => fetchListings(page - 1)} disabled={page <= 1} className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 3, totalPages - 6));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return (
                    <button key={p} onClick={() => fetchListings(p)} className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${p === page ? "bg-indigo-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      {p}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => fetchListings(page + 1)} disabled={page >= totalPages} className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
