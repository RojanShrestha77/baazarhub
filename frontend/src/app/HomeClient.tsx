"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingBag, Store, ArrowRight, Star, Shield, Truck, ChevronRight } from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/types";
import type { SearchResult } from "@/types";

const categories = [
  { name: "Electronics", icon: "🖥️", slug: "electronics", color: "bg-blue-50 hover:bg-blue-100" },
  { name: "Clothing", icon: "👕", slug: "clothing", color: "bg-pink-50 hover:bg-pink-100" },
  { name: "Home & Garden", icon: "🏡", slug: "home-garden", color: "bg-green-50 hover:bg-green-100" },
  { name: "Sports", icon: "⚽", slug: "sports", color: "bg-orange-50 hover:bg-orange-100" },
  { name: "Books", icon: "📚", slug: "books", color: "bg-purple-50 hover:bg-purple-100" },
  { name: "Toys", icon: "🧸", slug: "toys", color: "bg-yellow-50 hover:bg-yellow-100" },
  { name: "Health", icon: "💊", slug: "health", color: "bg-red-50 hover:bg-red-100" },
  { name: "Automotive", icon: "🚗", slug: "automotive", color: "bg-gray-50 hover:bg-gray-100" },
];

const fadeUp = { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { animate: { transition: { staggerChildren: 0.08 } } };

export default function HomeClient() {
  const router = useRouter();
  const [featured, setFeatured] = useState<SearchResult["listings"]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<SearchResult>("/listings/search?limit=8&sort=-createdAt").then((data) => setFeatured(data.listings || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center max-w-3xl mx-auto">
            <motion.h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              Buy & Sell with <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">Confidence</span>
            </motion.h1>
            <motion.p className="text-lg md:text-xl text-indigo-100 mb-10 max-w-2xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              A secure marketplace with escrow protection, verified sellers, and fair dispute resolution.
            </motion.p>
            <motion.div className="flex flex-col sm:flex-row gap-4 justify-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Link href="/marketplace" className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]">
                <ShoppingBag className="w-5 h-5" /> Browse Marketplace
              </Link>
              <Link href="/listings/new" className="inline-flex items-center justify-center gap-2 bg-indigo-500/30 backdrop-blur-sm text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-500/40 transition-all border border-indigo-400/30">
                <Store className="w-5 h-5" /> Start Selling
              </Link>
            </motion.div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div initial="initial" whileInView="animate" viewport={{ once: true }} variants={stagger} className="text-center mb-10">
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-gray-900 mb-3">Shop by Category</motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 max-w-xl mx-auto">Find exactly what you&apos;re looking for.</motion.p>
        </motion.div>
        <motion.div initial="initial" whileInView="animate" viewport={{ once: true }} variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <motion.button key={cat.name} variants={fadeUp} whileHover={{ y: -3 }} onClick={() => router.push(`/marketplace?category=${encodeURIComponent(cat.name)}`)} className={`${cat.color} rounded-xl p-5 text-left transition-all hover:shadow-md cursor-pointer border border-transparent hover:border-indigo-100`}>
              <div className="text-2xl mb-2">{cat.icon}</div>
              <h3 className="font-semibold text-gray-900 text-sm">{cat.name}</h3>
            </motion.button>
          ))}
        </motion.div>
      </section>

      {/* Featured listings */}
      {!loading && featured.length > 0 && (
        <section className="bg-white py-16 border-t border-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Featured Listings</h2>
                <p className="text-gray-500 mt-1">Fresh items from our community.</p>
              </div>
              <Link href="/marketplace" className="hidden sm:inline-flex items-center gap-1 text-indigo-600 font-medium hover:text-indigo-700 text-sm">View All <ChevronRight className="w-4 h-4" /></Link>
            </div>
            <motion.div initial="initial" whileInView="animate" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featured.map((item) => (
                <motion.div key={item.id} variants={fadeUp} whileHover={{ y: -5 }}>
                  <Link href={`/listings/${item.id}`} className="block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-indigo-100 transition-all group">
                    <div className="aspect-[4/3] bg-gradient-to-br from-indigo-50 to-purple-50 relative overflow-hidden">
                      {item.images.length > 0 ? (
                        <img src={`${API_BASE}/listings/${item.id}/images/${item.images[0]}`} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-12 h-12 text-indigo-200 group-hover:scale-110 transition-transform duration-300" /></div>
                      )}
                      {item.status === "active" && item.quantity <= 3 && item.quantity > 0 && (
                        <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Only {item.quantity} left</div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-bold text-gray-900">{formatPrice(item.priceMinorUnits)}</span>
                        <span className="text-xs text-gray-400 capitalize">{item.status}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
            <div className="text-center mt-8 sm:hidden">
              <Link href="/marketplace" className="inline-flex items-center gap-1 text-indigo-600 font-medium hover:text-indigo-700 text-sm">View All <ChevronRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div initial="initial" whileInView="animate" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Shield, title: "Escrow Protection", text: "Payment held securely until you confirm delivery. Your money is safe." },
            { icon: Star, title: "Verified Sellers", text: "Tiered verification system ensures you buy from trustworthy sellers." },
            { icon: Truck, title: "Dispute Resolution", text: "Fair mediation process. Raised disputes reviewed within 14 days." },
          ].map((item) => (
            <motion.div key={item.title} variants={fadeUp} className="text-center p-8 rounded-xl bg-white border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all">
              <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-700 py-16">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Start Selling Today</h2>
          <p className="text-indigo-100 mb-8 text-lg">Join our community. Escrow-protected transactions for every sale.</p>
          <Link href="/register" className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]">
            Get Started <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
