"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Package, PlusCircle, FileText } from "lucide-react";

export default function SellerPage() {
  const { user, loading } = useAuth();
  const [listings, setListings] = useState([]);

  useEffect(() => {
    if (loading) return;
    if (!user || (user.role !== "seller" && user.role !== "admin")) return;
    api.get("/listings/search?seller=" + user._id).then((data) => setListings(data.listings || data || [])).catch(() => {});
  }, [user, loading]);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">Loading...</div>;
  if (!user || (user.role !== "seller" && user.role !== "admin")) return <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">Seller access required.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Seller Dashboard</h1>
        <Link href="/listings/new" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-2"><PlusCircle className="w-4 h-4" />New Listing</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href="/seller/products" className="bg-white border rounded-lg p-6 hover:shadow-md"><Package className="w-8 h-8 text-indigo-600 mb-2" /><h2 className="font-semibold">Products</h2><p className="text-sm text-gray-500">Manage your listings</p></Link>
        <Link href="/seller/orders" className="bg-white border rounded-lg p-6 hover:shadow-md"><FileText className="w-8 h-8 text-green-600 mb-2" /><h2 className="font-semibold">Orders</h2><p className="text-sm text-gray-500">View incoming orders</p></Link>
        <Link href="/seller/verify" className="bg-white border rounded-lg p-6 hover:shadow-md"><FileText className="w-8 h-8 text-purple-600 mb-2" /><h2 className="font-semibold">Verification</h2><p className="text-sm text-gray-500">Submit seller documents</p></Link>
      </div>
    </div>
  );
}
