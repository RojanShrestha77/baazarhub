"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Package } from "lucide-react";

const statusColors = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  payment_received: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  disputed: "bg-red-100 text-red-800",
  released: "bg-green-100 text-green-800",
  refunded: "bg-gray-100 text-gray-800",
};

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    api.get("/escrow/orders").then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || loading) return <div className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-500">Loading...</div>;
  if (!user) return <div className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-500">Sign in to view orders</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-12"><Package className="w-12 h-12 mx-auto text-gray-300 mb-4" /><p className="text-gray-500">No orders yet</p></div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order._id} href={`/orders/${order._id}`} className="block bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div><p className="font-semibold">Order #{order._id.slice(-8)}</p><p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p></div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || "bg-gray-100"}`}>{order.status.replace(/_/g, " ")}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">Total: £{(order.total || order.amount || 0).toFixed(2)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
