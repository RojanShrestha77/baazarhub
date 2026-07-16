"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ShoppingCart, Shield, ChevronLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ListingClient({ id }) {
  const { user } = useAuth();
  const router = useRouter();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/listings/${id}`).then(setListing).catch(() => router.push("/marketplace")).finally(() => setLoading(false));
  }, [id, router]);

  const addToCart = async () => {
    if (!user) { router.push("/login"); return; }
    try {
      await api.post("/cart/items", { listingId: id, quantity: 1 });
      toast.success("Added to cart!");
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-500">Loading...</div>;
  if (!listing) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/marketplace" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-6"><ChevronLeft className="w-4 h-4" />Back to Marketplace</Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-4xl">📦</div>
        <div>
          <div className="flex items-start gap-2 mb-2">
            <h1 className="text-2xl font-bold">{listing.title}</h1>
            {listing.sellerTier === "verified" && <Shield className="w-6 h-6 text-green-500 shrink-0" title="Verified seller" />}
          </div>
          <p className="text-3xl font-bold text-indigo-600 mb-4">£{listing.price?.toFixed(2)}</p>
          <div className="flex gap-2 mb-4">
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm capitalize">{listing.condition}</span>
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">{listing.category}</span>
          </div>
          <p className="text-gray-600 mb-6">{listing.description}</p>
          {listing.seller && <p className="text-sm text-gray-500 mb-6">Sold by: {listing.seller.email || `User ${listing.seller}`}</p>}
          <div className="flex gap-3">
            <button onClick={addToCart} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 flex items-center justify-center gap-2"><ShoppingCart className="w-5 h-5" />Add to Cart</button>
          </div>
        </div>
      </div>
    </div>
  );
}
