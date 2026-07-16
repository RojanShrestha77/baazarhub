"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PlusCircle, Package, FileText, ShoppingBag, Shield, BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function SellerDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<"listings" | "orders">("listings");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    const fetchSeller = async () => {
      try {
        const [listings, orders] = await Promise.all([
          api.get<any[]>("/listings/search?limit=50").catch(() => []),
          api.get<any[]>("/escrow/orders").catch(() => []),
        ]);
        setData({ listings, orders });
      } catch { setData({ listings: [], orders: [] }); }
      finally { setLoading(false); }
    };
    fetchSeller();
  }, [user, router]);

  if (!user) return null;
  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" role="status"><span className="sr-only">Loading...</span></div></div>;
  if (!data) return null;

  const activeListings = data.listings.filter((l: any) => l.status === "active").length;
  const soldListings = data.listings.filter((l: any) => l.status === "sold").length;
  const pendingOrders = data.orders.filter((o: any) => o.status === "payment_held" || o.status === "shipped").length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your listings and orders</p>
          </div>
          <div className="flex gap-3">
            <Link href="/seller/verification" className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm">
              <Shield className="w-4 h-4" /> Verification
            </Link>
            <Link href="/listings/new" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-sm text-sm">
              <PlusCircle className="w-4 h-4" /> New Listing
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center"><Package className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-2xl font-bold text-gray-900">{activeListings}</p><p className="text-xs text-gray-500">Active Listings</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-blue-600" /></div>
              <div><p className="text-2xl font-bold text-gray-900">{soldListings}</p><p className="text-xs text-gray-500">Sold</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center"><BarChart3 className="w-5 h-5 text-purple-600" /></div>
              <div><p className="text-2xl font-bold text-gray-900">{pendingOrders}</p><p className="text-xs text-gray-500">Pending Orders</p></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-50 rounded-xl p-1">
          {(["listings", "orders"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {t === "listings" ? <><Package className="w-4 h-4 inline mr-1.5" />My Listings ({data.listings.length})</> : <><FileText className="w-4 h-4 inline mr-1.5" />Orders ({data.orders.length})</>}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "listings" && (data.listings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No listings yet</h3>
            <p className="text-sm text-gray-500 mb-6">Create your first listing to start selling.</p>
            <Link href="/listings/new" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors"><PlusCircle className="w-4 h-4" /> Create Listing</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {data.listings.map((l: any) => (
              <Link key={l.id || l._id} href={`/listings/${l.id || l._id}`} className="block bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0"><p className="font-medium text-gray-900 truncate">{l.title}</p><p className="text-xs text-gray-400 mt-0.5">{l.status} • {new Date(l.createdAt).toLocaleDateString()}</p></div>
                  <span className="text-sm font-medium text-indigo-600 ml-4">{l.priceMinorUnits !== undefined ? `NPR ${(l.priceMinorUnits / 100).toLocaleString()}` : ""}</span>
                </div>
              </Link>
            ))}
          </div>
        ))}

        {tab === "orders" && (data.orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">No orders received yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.orders.map((o: any) => (
              <Link key={o._id} href={`/orders/${o._id}`} className="block bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0"><p className="font-medium text-gray-900 truncate">{o.listingSnapshot?.title || "Order"}</p><p className="text-xs text-gray-400 mt-0.5 capitalize">{o.status.replace("_", " ")}</p></div>
                  <span className="text-sm text-gray-400 ml-4">{new Date(o.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
