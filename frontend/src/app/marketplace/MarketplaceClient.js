"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Search } from "lucide-react";

export default function MarketplaceClient() {
  const [listings, setListings] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/listings/search${search ? `?q=${encodeURIComponent(search)}` : ""}`)
      .then((data) => setListings(data.listings || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search listings..." className="w-full border rounded-lg pl-10 pr-4 py-2" />
        </div>
        <Link href="/listings/new" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Create Listing</Link>
      </div>
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No listings found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {listings.map((item) => (
            <Link key={item._id} href={`/listings/${item._id}`} className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-48 bg-gray-100 flex items-center justify-center text-gray-400">{item.images?.[0]?.filename ? "Image" : "No image"}</div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                <p className="text-lg font-bold text-indigo-600 mt-1">£{item.price?.toFixed(2)}</p>
                <p className="text-sm text-gray-500 mt-1 capitalize">{item.condition}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
