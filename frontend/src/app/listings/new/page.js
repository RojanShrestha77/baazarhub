"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import toast from "react-hot-toast";

export default function CreateListingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ title: "", description: "", price: "", condition: "new", category: "" });
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !user) { router.push("/login"); return null; }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const data = await api.post("/listings", { ...form, price: parseFloat(form.price) });
      toast.success("Listing created!");
      router.push(`/listings/${data._id || data.listing?._id}`);
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Create Listing</h1>
      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
        <div><label className="block text-sm font-medium mb-1">Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-4 py-2" required /></div>
        <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full border rounded-lg px-4 py-2" required /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Price (£)</label><input type="number" step="0.01" min="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border rounded-lg px-4 py-2" required /></div>
          <div><label className="block text-sm font-medium mb-1">Condition</label><select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="w-full border rounded-lg px-4 py-2"><option value="new">New</option><option value="like_new">Like New</option><option value="good">Good</option><option value="fair">Fair</option></select></div>
        </div>
        <div><label className="block text-sm font-medium mb-1">Category</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border rounded-lg px-4 py-2" placeholder="e.g. Electronics, Clothing" /></div>
        <button type="submit" disabled={submitting} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{submitting ? "Creating..." : "Create Listing"}</button>
      </form>
    </div>
  );
}
