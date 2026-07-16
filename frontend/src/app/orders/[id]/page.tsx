"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { api } from "@/lib/api";
import type { Order } from "@/types";
import toast from "react-hot-toast";

const statusColor: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  payment_received: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  disputed: "bg-red-100 text-red-800",
  released: "bg-gray-100 text-gray-800",
  refunded: "bg-orange-100 text-orange-800",
};

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    api.get(`/escrow/orders/${params.id}`).then((data) => setOrder(data as Order)).catch(() => {});
  }, [params.id]);

  if (!order) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  const updateStatus = async (status: string) => {
    try { await api.patch(`/escrow/orders/${order._id}/status`, { status }); setOrder({ ...order, status: status as Order["status"] }); toast.success("Order updated"); } catch { toast.error("Failed to update"); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
          <span className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${statusColor[order.status] || "bg-gray-100 text-gray-800"}`}>{order.status.replace("_", " ")}</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">{order.listing.title}</h2>
          <p className="text-2xl font-bold text-indigo-600 mb-4">${order.total.toFixed(2)}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-400">Buyer</span><p className="font-medium">{order.buyer.email}</p></div>
            <div><span className="text-gray-400">Seller</span><p className="font-medium">{order.seller.email}</p></div>
            <div><span className="text-gray-400">Ordered</span><p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p></div>
            {order.escrowReleaseDate && <div><span className="text-gray-400">Escrow Release</span><p className="font-medium">{new Date(order.escrowReleaseDate).toLocaleDateString()}</p></div>}
          </div>
        </div>
        <div className="bg-indigo-50 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-600 mt-0.5" />
          <p className="text-sm text-indigo-900">Escrow protection active. Payment released only after delivery confirmation.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {order.status === "payment_received" && (
            <button onClick={() => updateStatus("shipped")} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors">Mark as Shipped</button>
          )}
          {order.status === "shipped" && (
            <>
              <button onClick={() => updateStatus("delivered")} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-green-700 transition-colors">Confirm Delivery</button>
              <button onClick={() => updateStatus("disputed")} className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-red-700 transition-colors">Open Dispute</button>
            </>
          )}
          {order.status === "delivered" && (
            <button onClick={() => updateStatus("disputed")} className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-red-700 transition-colors">Open Dispute</button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
