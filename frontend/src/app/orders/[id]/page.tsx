"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Truck, CheckCircle, AlertTriangle, Shield, Package, ChevronLeft, Clock, Ban, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Order } from "@/types";
import { formatPrice } from "@/types";
import toast from "react-hot-toast";

const statusConfig: Record<string, { label: string; color: string; icon: any; desc: string }> = {
  created: { label: "Pending Payment", color: "bg-yellow-100 text-yellow-800", icon: Clock, desc: "Awaiting payment confirmation." },
  payment_held: { label: "Payment Held", color: "bg-blue-100 text-blue-800", icon: Shield, desc: "Payment received and held in escrow. Seller will ship soon." },
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-800", icon: Truck, desc: "Seller has marked this order as shipped." },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800", icon: CheckCircle, desc: "Buyer confirmed delivery. Funds will be released." },
  disputed: { label: "Disputed", color: "bg-red-100 text-red-800", icon: AlertTriangle, desc: "A dispute has been opened. Admin will review." },
  released: { label: "Completed", color: "bg-gray-100 text-gray-800", icon: CheckCircle, desc: "Order completed. Funds released to seller." },
  refunded: { label: "Refunded", color: "bg-gray-100 text-gray-800", icon: Package, desc: "Order refunded." },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-600", icon: Ban, desc: "This order was cancelled and any payment released." },
};

const timelineSteps = ["created", "payment_held", "shipped", "delivered"];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    api.get<Order>(`/escrow/orders/${params.id}`).then(setOrder).catch(() => {}).finally(() => setLoading(false));
  }, [user, router, params.id]);

  const doAction = async (action: string, label: string) => {
    setActionLoading(action);
    try {
      const actionMap: Record<string, string> = { ship: "ship", confirm: "confirm-delivery", dispute: "dispute" };
      await api.post(`/escrow/orders/${params.id}/${actionMap[action] || action}`, {});
      toast.success(`${label} successful`);
      setOrder(await api.get<Order>(`/escrow/orders/${params.id}`));
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : `${label} failed`);
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) return null;
  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" role="status"><span className="sr-only">Loading...</span></div></div>;
  if (!order) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Package className="w-16 h-16 text-gray-200" />
      <p className="text-gray-500">Order not found</p>
      <Link href="/orders" className="text-indigo-600 font-medium hover:text-indigo-700">Back to Orders</Link>
    </div>
  );

  const cfg = statusConfig[order.status] || { label: order.status, color: "bg-gray-100", icon: Package, desc: "" };
  const Icon = cfg.icon;
  const isBuyer = user?.id === order.buyerId;
  const isSeller = user?.id === order.sellerId;
  const currentStepIdx = timelineSteps.indexOf(order.status);
  const showTimeline = currentStepIdx >= 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors"><ChevronLeft className="w-4 h-4" /> Back to Orders</Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Status header */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">{order.listingSnapshot?.title || "Order"}</h1>
            <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${cfg.color}`}><Icon className="w-4 h-4" />{cfg.label}</span>
          </div>
          <p className="text-sm text-gray-500">{cfg.desc}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 text-sm">
            <div><span className="text-gray-400 text-xs">Quantity</span><p className="font-medium text-gray-900 mt-0.5">{order.quantity}</p></div>
            <div><span className="text-gray-400 text-xs">Unit Price</span><p className="font-medium text-gray-900 mt-0.5">{formatPrice(order.listingSnapshot?.priceMinorUnits || 0)}</p></div>
            <div><span className="text-gray-400 text-xs">Total</span><p className="font-semibold text-indigo-600 mt-0.5">{formatPrice(order.totalMinorUnits)}</p></div>
            <div><span className="text-gray-400 text-xs">Placed</span><p className="font-medium text-gray-900 mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p></div>
          </div>
        </div>

        {/* Timeline */}
        {showTimeline && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm mb-6">
            <h2 className="font-semibold text-gray-900 mb-5">Order Timeline</h2>
            <div className="relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-100" />
              <div className="space-y-6">
                {timelineSteps.map((step, i) => {
                  const s = statusConfig[step];
                  const isCompleted = currentStepIdx >= i;
                  const isCurrent = currentStepIdx === i;
                  return (
                    <div key={step} className="flex items-start gap-4 relative">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${isCompleted ? "bg-indigo-600" : "bg-gray-100"}`}>
                        {isCompleted ? <CheckCircle className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                      </div>
                      <div className={`-mt-0.5 ${isCurrent ? "font-semibold text-gray-900" : isCompleted ? "text-gray-600" : "text-gray-400"}`}>
                        <p className="text-sm">{s.label}</p>
                        <p className="text-xs mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {(order.status === "payment_held") && isSeller && (
            <button onClick={() => doAction("ship", "Ship")} disabled={actionLoading !== null} className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm">
              <Truck className="w-5 h-5" />{actionLoading === "ship" ? "Shipping..." : "Mark as Shipped"}
            </button>
          )}
          {order.status === "shipped" && isBuyer && (
            <button onClick={() => doAction("confirm", "Confirm Delivery")} disabled={actionLoading !== null} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm">
              <CheckCircle className="w-5 h-5" />{actionLoading === "confirm" ? "Confirming..." : "Confirm Delivery"}
            </button>
          )}
          {(order.status === "payment_held" || order.status === "shipped") && isBuyer && (
            <button onClick={() => doAction("dispute", "Dispute")} disabled={actionLoading !== null} className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm">
              <AlertTriangle className="w-5 h-5" />{actionLoading === "dispute" ? "Disputing..." : "Raise Dispute"}
            </button>
          )}
          {(order.status === "created" || order.status === "payment_held") && isBuyer && (
            <button onClick={() => doAction("cancel", "Cancellation")} disabled={actionLoading !== null} className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50 transition-all active:scale-[0.98]">
              <X className="w-5 h-5" />{actionLoading === "cancel" ? "Cancelling…" : "Cancel Order"}
            </button>
          )}
          {order.status === "delivered" && (
            <div className="bg-green-50 rounded-xl p-4 flex items-center gap-3 border border-green-100">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800 font-medium">Order completed. Funds have been released to the seller.</p>
            </div>
          )}
          {order.status === "released" && (
            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3 border border-gray-100">
              <CheckCircle className="w-5 h-5 text-gray-600" />
              <p className="text-sm text-gray-700 font-medium">Order completed successfully.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
