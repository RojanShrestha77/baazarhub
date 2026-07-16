"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import toast from "react-hot-toast";

export default function AdminVerificationPage() {
  const { user, loading } = useAuth();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (loading || !user || user.role !== "admin") return;
    api.get("/verification/requests").then(setRequests).catch(() => {});
  }, [user, loading]);

  const handleAction = async (id, action) => {
    try {
      await api.post(`/verification/requests/${id}/${action}`, {});
      toast.success(`Request ${action}ed`);
      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (err) { toast.error(err.message); }
  };

  if (!user || user.role !== "admin") return <div className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-500">Access denied.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Verification Requests</h1>
      {requests.length === 0 ? <p className="text-gray-500">No pending requests</p> : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req._id} className="bg-white border rounded-lg p-4 flex justify-between items-center">
              <div><p className="font-semibold">User: {req.userId}</p><p className="text-sm text-gray-500">{req.documentType} — Submitted {new Date(req.createdAt).toLocaleDateString()}</p></div>
              <div className="flex gap-2">
                <button onClick={() => handleAction(req._id, "approve")} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">Approve</button>
                <button onClick={() => handleAction(req._id, "reject")} className="bg-red-600 text-white px-4 py-1.5 rounded text-sm hover:bg-red-700">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
