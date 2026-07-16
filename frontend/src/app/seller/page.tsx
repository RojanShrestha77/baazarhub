"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PlusCircle, Package, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function SellerDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<"listings" | "orders">("listings");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    const fetchSellers = async () => {
      try {
        const [listings, orders] = await Promise.all([
          api.get<any[]>("/listings?my=true").catch(() => []),
          api.get<any[]>("/orders/seller").catch(() => []),
        ]);
        setData({ listings, orders });
      } catch { setData({ listings: [], orders: [] }); }
    };
    fetchSellers();
  }, [user, router]);

  if (!data) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" role="status"><span className="sr-only">Loading...</span></div></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
          <Link href="/listings/new" className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
            <PlusCircle className="w-4 h-4" />New Listing
          </Link>
        </div>
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("listings")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "listings" ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-50"}`}><Package className="w-4 h-4 inline mr-1.5" />My Listings ({data.listings.length})</button>
          <button onClick={() => setTab("orders")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "orders" ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-50"}`}><FileText className="w-4 h-4 inline mr-1.5" />Orders ({data.orders.length})</button>
        </div>
        {tab === "listings" && (
          <div className="space-y-3">
            {data.listings.length === 0 && <p className="text-gray-500 text-center py-12">No listings yet. <Link href="/listings/new" className="text-indigo-600 hover:underline">Create one</Link></p>}
            {data.listings.map((l: any) => (
              <Link key={l.id} href={`/listings/${l.id}`} className="block bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div><p className="font-semibold text-gray-900">{l.title}</p><p className="text-sm text-gray-500">{l.status}</p></div>
                  <span className="text-sm text-gray-400">{new Date(l.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {tab === "orders" && (
          <div className="space-y-3">
            {data.orders.length === 0 && <p className="text-gray-500 text-center py-12">No orders yet.</p>}
            {data.orders.map((o: any) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="block bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div><p className="font-semibold text-gray-900">{o.listingTitle}</p><p className="text-sm text-gray-500 capitalize">{o.status.replace("_", " ")}</p></div>
                  <span className="text-sm text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
