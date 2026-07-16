"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import toast from "react-hot-toast";

export default function SellerVerifyPage() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const formData = new FormData(e.target);
      await fetch("http://localhost:5000/api/verification/submit", { method: "POST", body: formData, credentials: "include" });
      toast.success("Verification submitted!");
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Seller Verification</h1>
      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
        <div><label className="block text-sm font-medium mb-1">Document Type</label><select name="documentType" className="w-full border rounded-lg px-4 py-2" required><option value="id">ID Card</option><option value="business_license">Business License</option><option value="address_proof">Address Proof</option></select></div>
        <div><label className="block text-sm font-medium mb-1">Document File</label><input type="file" name="document" className="w-full" required /></div>
        <button type="submit" disabled={submitting} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{submitting ? "Submitting..." : "Submit Verification"}</button>
      </form>
    </div>
  );
}
