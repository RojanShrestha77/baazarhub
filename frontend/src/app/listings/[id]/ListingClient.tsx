"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShoppingBag, ShoppingCart, Shield, BadgeCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Listing } from "@/types";
import toast from "react-hot-toast";

export default function ListingClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);

  useEffect(() => {
    api.get(`/listings/${id}`).then((data) => setListing(data as Listing)).catch(() => {});
  }, [id]);

  if (!listing) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="aspect-[4/3] bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl flex items-center justify-center border border-gray-100">
          <ShoppingBag className="w-24 h-24 text-indigo-300" />
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{listing.title}</h1>
            {listing.seller?.name && <BadgeCheck className="w-6 h-6 text-indigo-500" />}
          </div>
          <div className="text-4xl font-bold text-indigo-600 mb-6">${listing.price.toFixed(2)}</div>
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full capitalize">{listing.condition.replace("_", " ")}</span>
            <span className="px-3 py-1 bg-gray-50 text-gray-600 text-sm rounded-full capitalize">{listing.category}</span>
          </div>
          <p className="text-gray-600 mb-8 leading-relaxed">{listing.description}</p>
          <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
            <Shield className="w-4 h-4 text-indigo-500" />
            <span>Escrow protected transaction</span>
          </div>
          <div className="flex gap-4">
            <button onClick={async () => {
              if (!user) { router.push("/login"); return; }
              try { await api.post("/cart", { listingId: listing._id }); toast.success("Added to cart"); } catch { toast.error("Failed to add"); }
            }} className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
              <ShoppingCart className="w-5 h-5" /> Add to Cart
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
