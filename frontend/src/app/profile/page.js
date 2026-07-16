"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { User, Mail, Shield, Download, Upload } from "lucide-react";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user) {
      api.get("/profiles/me").then((data) => { setProfile(data); setBio(data.bio || ""); }).catch(() => {});
    }
  }, [user, loading, router]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.patch("/profiles/me", { bio });
      toast.success("Profile updated");
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const exportData = async () => {
    try {
      const data = await api.get("/profiles/me/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "bazaarhub-export.json"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported");
    } catch (err) { toast.error(err.message); }
  };

  if (loading || !profile) return <div className="max-w-2xl mx-auto px-4 py-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      <div className="bg-white border rounded-lg p-6 space-y-6">
        <div className="flex items-center gap-4 pb-4 border-b">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center"><User className="w-8 h-8 text-indigo-600" /></div>
          <div>
            <h2 className="font-semibold text-lg">{profile.email}</h2>
            <p className="text-sm text-gray-500 capitalize">Role: {profile.role} {profile.sellerTier !== "unverified" && `· ${profile.sellerTier} seller`}</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full border rounded-lg px-4 py-2" placeholder="Tell buyers about yourself..." />
        </div>
        <div className="flex gap-3">
          <button onClick={saveProfile} disabled={saving} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{saving ? "Saving..." : "Save Profile"}</button>
          <button onClick={exportData} className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"><Download className="w-4 h-4" />Export Data</button>
        </div>
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Security</h3>
          <div className="space-y-3">
            {!user?.mfaEnabled && (
              <button onClick={() => router.push("/mfa/enrol")} className="text-sm text-indigo-600 hover:underline flex items-center gap-2"><Shield className="w-4 h-4" />Enable Two-Factor Auth</button>
            )}
            <button onClick={() => router.push("/password/change")} className="text-sm text-indigo-600 hover:underline block mt-2">Change Password</button>
          </div>
        </div>
      </div>
    </div>
  );
}
