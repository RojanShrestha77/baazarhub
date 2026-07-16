"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingBag, Store, ArrowRight, Star, Shield, Truck } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/types";
import type { SearchResult } from "@/types";

const categories = [
  { name: "Electronics", icon: "🖥️", color: "bg-blue-50 text-blue-600" },
  { name: "Clothing", icon: "👕", color: "bg-pink-50 text-pink-600" },
  { name: "Home & Garden", icon: "🏡", color: "bg-green-50 text-green-600" },
  { name: "Sports", icon: "⚽", color: "bg-orange-50 text-orange-600" },
  { name: "Books", icon: "📚", color: "bg-purple-50 text-purple-600" },
  { name: "Toys", icon: "🧸", color: "bg-yellow-50 text-yellow-600" },
  { name: "Health", icon: "💊", color: "bg-red-50 text-red-600" },
  { name: "Automotive", icon: "🚗", color: "bg-gray-50 text-gray-600" },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

export default function HomeClient() {
  const router = useRouter();
  const [featured, setFeatured] = useState<SearchResult["listings"]>([]);

  useEffect(() => {
    api.get<SearchResult>("/listings/search?limit=8").then((data) => setFeatured(data.listings || [])).catch(() => {});
  }, []);

  return (
    <div>
      <section className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center max-w-3xl mx-auto">
            <motion.h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              Buy & Sell with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">Confidence</span>
            </motion.h1>
            <motion.p className="text-lg md:text-xl text-indigo-100 mb-10 max-w-2xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              A secure marketplace with escrow protection, verified sellers, and dispute resolution.
            </motion.p>
            <motion.div className="flex flex-col sm:flex-row gap-4 justify-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Link href="/marketplace" className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl">
                <ShoppingBag className="w-5 h-5" /> Browse Marketplace
              </Link>
              <Link href="/listings/new" className="inline-flex items-center justify-center gap-2 bg-indigo-500 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-400 transition-all border border-indigo-400">
                <Store className="w-5 h-5" /> Start Selling
              </Link>
            </motion.div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div initial="initial" whileInView="animate" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-gray-900 mb-4">Shop by Category</motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 max-w-xl mx-auto">Find exactly what you are looking for across our marketplace.</motion.p>
        </motion.div>
        <motion.div initial="initial" whileInView="animate" viewport={{ once: true }} variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <motion.div key={cat.name} variants={fadeUp} whileHover={{ y: -4 }} className={`${cat.color} rounded-2xl p-6 cursor-pointer transition-shadow hover:shadow-lg`} onClick={() => router.push(`/marketplace?category=${encodeURIComponent(cat.name)}`)}>
              <div className="text-3xl mb-3">{cat.icon}</div>
              <h3 className="font-semibold text-gray-900">{cat.name}</h3>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {featured.length > 0 && (
        <section className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="initial" whileInView="animate" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
              <motion.h2 variants={fadeUp} className="text-3xl font-bold text-gray-900 mb-4">Featured Listings</motion.h2>
              <motion.p variants={fadeUp} className="text-gray-500">Fresh items from our community of sellers.</motion.p>
            </motion.div>
            <motion.div initial="initial" whileInView="animate" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map((item) => (
                <motion.div key={item.id} variants={fadeUp} whileHover={{ y: -6 }}>
                  <Link href={`/listings/${item.id}`} className="block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all group">
                    <div className="aspect-[4/3] bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                      <ShoppingBag className="w-12 h-12 text-indigo-300 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-bold text-indigo-600">{formatPrice(item.priceMinorUnits)}</span>
                        <span className="text-xs text-gray-400">{item.status === "active" ? "Active" : item.status}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div initial="initial" whileInView="animate" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Shield, title: "Escrow Protection", text: "Payment held securely until you confirm delivery." },
            { icon: Star, title: "Verified Sellers", text: "Tiered verification system ensures seller trustworthiness." },
            { icon: Truck, title: "Dispute Resolution", text: "Fair mediation process for every transaction." },
          ].map((item) => (
            <motion.div key={item.title} variants={fadeUp} className="text-center p-8 rounded-2xl bg-white border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="bg-gradient-to-r from-indigo-600 to-purple-700 py-16">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">Start Selling Today</h2>
          <p className="text-indigo-100 mb-8">Join our community of sellers and reach thousands of buyers with escrow-protected transactions.</p>
          <Link href="/register" className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-50 transition-all shadow-lg">
            Get Started <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
