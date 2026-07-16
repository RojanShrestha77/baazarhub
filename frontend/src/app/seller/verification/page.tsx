"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Upload } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import toast from "react-hot-toast";

export default function VerificationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState<{ status: string; submittedAt?: string } | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    api.get<{ status: string; submittedAt?: string }>("/verification/status").then(setStatus).catch(() => setStatus(null));
  }, [user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!documentFile || !documentType) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("documentType", documentType);
      form.append("document", documentFile);
      const result = await api.upload<{ status: string }>("/verification/submit", form);
      setStatus(result);
      toast.success("Verification submitted");
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-900">Seller Verification</h1>
        </div>
        {status?.status === "approved" ? (
          <div className="bg-green-50 rounded-2xl p-6 text-center border border-green-100">
            <Shield className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-green-800">Verified</p>
            <p className="text-sm text-green-600 mt-1">Your identity has been verified. You can now sell on BazaarHub.</p>
          </div>
        ) : status?.status === "pending" ? (
          <div className="bg-yellow-50 rounded-2xl p-6 text-center border border-yellow-100">
            <p className="text-lg font-semibold text-yellow-800">Pending Review</p>
            <p className="text-sm text-yellow-600 mt-1">Submitted {status.submittedAt ? new Date(status.submittedAt).toLocaleDateString() : "recently"}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <p className="text-sm text-gray-600">Submit a government-issued ID to become a verified seller.</p>
            <div>
              <label htmlFor="v-doc-type" className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
              <select id="v-doc-type" value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white" required>
                <option value="">Select...</option>
                <option value="citizenship">Citizenship</option>
                <option value="passport">Passport</option>
                <option value="driving_license">Driving License</option>
              </select>
            </div>
            <div>
              <label htmlFor="v-doc-file" className="block text-sm font-medium text-gray-700 mb-1">Upload Document</label>
              <input id="v-doc-file" type="file" accept="image/*,.pdf" onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" required />
            </div>
            <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
              <Upload className="w-4 h-4" />{submitting ? "Submitting..." : "Submit for Verification"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
