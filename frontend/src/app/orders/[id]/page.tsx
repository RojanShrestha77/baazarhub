"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Package, Truck, CheckCircle, AlertTriangle, Shield } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Order } from "@/types";
import { formatPrice } from "@/types";
import toast from "react-hot-toast";

const statusLabels: Record<string, string> = {
  pending_payment: "Pending Payment", paid: "Paid", shipped: "Shipped",
  delivered: "Delivered", disputed: "Disputed", released: "Completed",
  cancelled: "Cancelled",
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    api.get<Order>(`/orders/${params.id}`).then(setOrder).catch(() => toast.error("Order not found")).finally(() => setLoading(false));
  }, [user, router, params.id]);

  const doAction = async (action: string, label: string) => {
    setActionLoading(action);
    try {
      await api.post(`/escrow/${params.id}/${action}`, {});
      toast.success(`${label} successful`);
      const updated = await api.get<Order>(`/orders/${params.id}`);
      setOrder(updated);
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : `${label} failed`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" role="status"><span className="sr-only">Loading...</span></div></div>;
  if (!order) return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">Order not found</div>;

  const isBuyer = user?.id === order.buyerId;
  const isSeller = user?.id === order.sellerId;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{order.listingTitle}</h1>
            <span className={`text-sm font-medium px-3 py-1.5 rounded-full capitalize ${statusLabels[order.status] ? "bg-indigo-100 text-indigo-800" : "bg-gray-100"}`}>{statusLabels[order.status] || order.status}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Quantity</span><p className="font-medium">{order.quantity}</p></div>
            <div><span className="text-gray-500">Unit Price</span><p className="font-medium">{formatPrice(order.unitPriceMinorUnits)}</p></div>
            <div><span className="text-gray-500">Total</span><p className="font-medium text-indigo-600">{formatPrice(order.totalMinorUnits)}</p></div>
            <div><span className="text-gray-500">Placed</span><p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p></div>
          </div>
        </div>

        {(order.status === "paid" || order.status === "shipped" || order.status === "delivered") && (
          <div className="bg-indigo-50 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <Shield className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-indigo-900">Funds held in escrow. Released when you confirm delivery.</p>
          </div>
        )}

        <div className="space-y-3">
          {isSeller && order.status === "paid" && (
            <button onClick={() => doAction("ship", "Ship")} disabled={actionLoading !== null} className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm">
              <Truck className="w-5 h-5" />{actionLoading === "ship" ? "Shipping..." : "Mark as Shipped"}
            </button>
          )}
          {isBuyer && order.status === "shipped" && (
            <button onClick={() => doAction("confirm", "Confirm Delivery")} disabled={actionLoading !== null} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm">
              <CheckCircle className="w-5 h-5" />{actionLoading === "confirm" ? "Confirming..." : "Confirm Delivery"}
            </button>
          )}
          {isBuyer && (order.status === "paid" || order.status === "shipped") && (
            <button onClick={() => doAction("dispute", "Dispute")} disabled={actionLoading !== null} className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm">
              <AlertTriangle className="w-5 h-5" />{actionLoading === "dispute" ? "Disputing..." : "Raise Dispute"}
            </button>
          )}
          {order.status === "delivered" && (
            <div className="bg-green-50 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800 font-medium">Order completed. Funds released to seller.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
