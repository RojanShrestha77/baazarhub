"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PlusCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function SellerProductsPage() {
  const { user, loading } = useAuth();
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);

  useEffect(() => {
    if (loading || !user) return;
    api.get("/listings/search").then((data) => setListings(data.listings || data || [])).catch(() => {}).finally(() => setLoadingListings(false));
  }, [user, loading]);

  const deleteListing = async (id) => {
    if (!confirm("Delete this listing?")) return;
    try {
      await api.delete(`/listings/${id}`);
      setListings((prev) => prev.filter((l) => l._id !== id));
      toast.success("Listing deleted");
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Products</h1>
        <Link href="/listings/new" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-2"><PlusCircle className="w-4 h-4" />New</Link>
      </div>
      {loadingListings ? <div className="text-center py-12 text-gray-500">Loading...</div> : listings.length === 0 ? <p className="text-gray-500">No listings yet.</p> : (
        <div className="space-y-3">
          {listings.map((item) => (
            <div key={item._id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
              <div><Link href={`/listings/${item._id}`} className="font-semibold hover:text-indigo-600">{item.title}</Link><p className="text-sm text-gray-500">£{item.price?.toFixed(2)}</p></div>
              <div className="flex gap-2">
                <Link href={`/listings/${item._id}/edit`} className="text-indigo-600 hover:underline text-sm">Edit</Link>
                <button onClick={() => deleteListing(item._id)} className="text-red-600 hover:underline text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
