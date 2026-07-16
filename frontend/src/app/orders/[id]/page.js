"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Shield, ChevronLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const statusColors = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  payment_received: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  disputed: "bg-red-100 text-red-800",
  released: "bg-green-100 text-green-800",
  refunded: "bg-gray-100 text-gray-800",
};

export default function OrderDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    api.get(`/escrow/orders/${params.id}`).then(setOrder).catch(() => router.push("/orders")).finally(() => setLoading(false));
  }, [params.id, user, router]);

  const shipOrder = async () => {
    try {
      await api.post(`/escrow/orders/${params.id}/ship`, {});
      toast.success("Order marked as shipped!"); setOrder((prev) => ({ ...prev, status: "shipped" }));
    } catch (err) { toast.error(err.message); }
  };

  const confirmDelivery = async () => {
    try {
      await api.post(`/escrow/orders/${params.id}/confirm-delivery`, {});
      toast.success("Delivery confirmed! Funds held for release."); setOrder((prev) => ({ ...prev, status: "delivered" }));
    } catch (err) { toast.error(err.message); }
  };

  const disputeOrder = async () => {
    try {
      await api.post(`/escrow/orders/${params.id}/dispute`, {});
      toast.success("Dispute opened. Admin will review."); setOrder((prev) => ({ ...prev, status: "disputed" }));
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8 text-center text-gray-500">Loading...</div>;
  if (!order) return null;

  const isBuyer = user?._id === order.buyerId;
  const isSeller = user?._id === order.sellerId;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/orders" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-6"><ChevronLeft className="w-4 h-4" />Back to Orders</Link>
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Order #{order._id.slice(-8)}</h1>
            <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[order.status] || "bg-gray-100"}`}>{order.status.replace(/_/g, " ")}</span>
        </div>
        <div className="flex items-center gap-2 mb-6 text-green-700 bg-green-50 rounded-lg p-3">
          <Shield className="w-5 h-5" />
          <span className="text-sm font-medium">This transaction is protected by escrow.</span>
        </div>
        {order.items?.map((item, i) => (
          <div key={i} className="flex justify-between py-2 border-b"><span>{item.title || `Item ${i + 1}`} × {item.quantity || 1}</span><span>£{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span></div>
        ))}
        <div className="flex justify-between pt-4 font-bold text-lg"><span>Total</span><span>£{(order.total || order.amount || 0).toFixed(2)}</span></div>
        {(order.status === "payment_received" && isSeller) && <button onClick={shipOrder} className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">Mark as Shipped</button>}
        {(order.status === "shipped" && isBuyer) && (
          <div className="mt-6 flex gap-3">
            <button onClick={confirmDelivery} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">Confirm Delivery</button>
            <button onClick={disputeOrder} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">Open Dispute</button>
          </div>
        )}
        {(order.status === "delivered" && isBuyer) && <button onClick={disputeOrder} className="mt-6 w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">Open Dispute</button>}
      </div>
    </div>
  );
}
