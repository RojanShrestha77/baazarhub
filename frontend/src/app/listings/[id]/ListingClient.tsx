"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShoppingBag, ShoppingCart, Shield, ChevronLeft } from "lucide-react";
import { api, ApiError, API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { SerializedListing } from "@/types";
import { formatPrice } from "@/types";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ListingClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState<SerializedListing | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.get<SerializedListing>(`/listings/${id}`).then(setListing).catch(() => {});
  }, [id]);

  if (!listing) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" role="status"><span className="sr-only">Loading...</span></div>
    </div>
  );

  if (listing.status !== "active") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Listing Not Available</h1>
        <p className="text-gray-500 mb-6">This item is no longer for sale.</p>
        <Link href="/marketplace" className="text-indigo-600 font-medium hover:text-indigo-700">Back to marketplace</Link>
      </div>
    );
  }

  const addToCart = async () => {
    if (!user) { router.push("/login"); return; }
    setAdding(true);
    try {
      await api.post("/cart/items", { listingId: id, quantity });
      toast.success("Added to cart");
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const firstImage = listing.images.length > 0 ? `${API_BASE}/listings/${id}/images/${listing.images[0]}` : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/marketplace" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to marketplace
      </Link>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          {firstImage ? (
            <img src={firstImage} alt={listing.title} className="w-full aspect-[4/3] object-cover rounded-2xl border border-gray-100" />
          ) : (
            <div className="aspect-[4/3] bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl flex items-center justify-center border border-gray-100">
              <ShoppingBag className="w-24 h-24 text-indigo-300" />
            </div>
          )}
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
          <div className="text-4xl font-bold text-indigo-600 mb-6">{formatPrice(listing.priceMinorUnits)}</div>
          <p className="text-gray-600 mb-6 leading-relaxed">{listing.description}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full">{listing.category}</span>
            <span className="px-3 py-1 bg-gray-50 text-gray-600 text-sm rounded-full">Qty: {listing.quantity}</span>
          </div>
          <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
            <Shield className="w-4 h-4 text-indigo-500" />
            <span>Escrow protected transaction</span>
          </div>
          <div className="flex items-center gap-4 mb-8">
            <label htmlFor="cart-qty" className="text-sm font-medium text-gray-700">Quantity:</label>
            <input id="cart-qty" type="number" min={1} max={listing.quantity} value={quantity} onChange={(e) => setQuantity(Math.min(Math.max(1, Number(e.target.value)), listing.quantity))} className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-center focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <button onClick={addToCart} disabled={adding} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
            <ShoppingCart className="w-5 h-5" /> {adding ? "Adding..." : "Add to Cart"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
