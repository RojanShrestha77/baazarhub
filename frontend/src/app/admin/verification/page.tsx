"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { VerificationRequest } from "@/types";
import toast from "react-hot-toast";

export default function AdminVerificationPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);

  useEffect(() => {
    api.get("/admin/verification").then((data) => setRequests(data as VerificationRequest[])).catch(() => {});
  }, []);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    try { await api.patch(`/admin/verification/${id}`, { status }); setRequests(requests.map((r) => r._id === id ? { ...r, status } : r)); toast.success(`Request ${status}`); } catch { toast.error("Failed"); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Verification Requests</h1>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-gray-600"><th className="text-left p-4 font-medium">User</th><th className="text-left p-4 font-medium">Document</th><th className="text-left p-4 font-medium">Status</th><th className="text-left p-4 font-medium">Actions</th></tr></thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r._id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="p-4 text-gray-700">{r.user.email}</td>
                <td className="p-4 text-gray-600 capitalize">{r.documentType.replace("_", " ")}</td>
                <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${r.status === "approved" ? "bg-green-100 text-green-700" : r.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{r.status}</span></td>
                <td className="p-4">
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(r._id, "approved")} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">Approve</button>
                      <button onClick={() => handleAction(r._id, "rejected")} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
