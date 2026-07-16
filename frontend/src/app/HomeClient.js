"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Search, Shield, Truck, BadgeCheck } from "lucide-react";

const categories = [
  { name: "Electronics", icon: "💻", slug: "Electronics" },
  { name: "Clothing", icon: "👕", slug: "Clothing" },
  { name: "Home & Garden", icon: "🏡", slug: "Home & Garden" },
  { name: "Sports", icon: "⚽", slug: "Sports" },
  { name: "Books", icon: "📚", slug: "Books" },
  { name: "Toys", icon: "🎮", slug: "Toys" },
  { name: "Health", icon: "💊", slug: "Health & Beauty" },
  { name: "Automotive", icon: "🚗", slug: "Automotive" },
];

export default function HomeClient() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api.get("/listings/search?limit=8").then((data) => setFeatured(data.listings || data || [])).catch(() => {});
  }, []);

  return (
    <div>
      <section className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl font-bold mb-4">Welcome to BazaarHub</h1>
          <p className="text-xl mb-8 text-indigo-200">Buy and sell with confidence — secure escrow payments, verified sellers, and buyer protection.</p>
          <div className="flex justify-center gap-4">
            <Link href="/marketplace" className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50">Browse Marketplace</Link>
            <Link href="/register" className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10">Start Selling</Link>
          </div>
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
            <div className="text-center"><Shield className="w-8 h-8 mx-auto mb-2 text-indigo-300" /><p className="text-sm text-indigo-200">Escrow Protection</p></div>
            <div className="text-center"><BadgeCheck className="w-8 h-8 mx-auto mb-2 text-indigo-300" /><p className="text-sm text-indigo-200">Verified Sellers</p></div>
            <div className="text-center"><Truck className="w-8 h-8 mx-auto mb-2 text-indigo-300" /><p className="text-sm text-indigo-200">Secure Delivery</p></div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6">Categories</h2>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
          {categories.map((cat) => (
            <Link key={cat.slug} href={`/marketplace?category=${encodeURIComponent(cat.slug)}`} className="flex flex-col items-center p-4 bg-white border rounded-xl hover:shadow-md transition-shadow">
              <span className="text-3xl mb-2">{cat.icon}</span>
              <span className="text-xs text-gray-600 text-center font-medium">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Featured Listings</h2>
          <Link href="/marketplace" className="text-indigo-600 hover:underline text-sm">View All →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((item) => (
            <Link key={item._id} href={`/listings/${item._id}`} className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-48 bg-gray-100 flex items-center justify-center text-gray-400">{item.images?.[0]?.filename ? "Image" : "📦"}</div>
              <div className="p-4">
                <h3 className="font-semibold truncate">{item.title}</h3>
                <p className="text-lg font-bold text-indigo-600 mt-1">£{item.price?.toFixed(2)}</p>
                <p className="text-sm text-gray-500 capitalize">{item.condition}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Start Selling Today</h2>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">Create listings, reach buyers, and get paid securely through our escrow system.</p>
          <Link href="/register" className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700">Create Your Account</Link>
        </div>
      </section>
    </div>
  );
}
