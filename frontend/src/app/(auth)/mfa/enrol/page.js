"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import toast from "react-hot-toast";

export default function MfaEnrolPage() {
  const { user } = useAuth();
  const [secret, setSecret] = useState(null);
  const [otpauthUri, setOtpauthUri] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [code, setCode] = useState("");
  const [step, setStep] = useState("enrol");
  const [loading, setLoading] = useState(false);

  const startEnrol = async () => {
    setLoading(true);
    try {
      const data = await api.post("/auth/mfa/enrol", {});
      setSecret(data.secret);
      setOtpauthUri(data.otpauthUri);
      setRecoveryCodes(data.recoveryCodes);
      setStep("verify");
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const verifyCode = async () => {
    setLoading(true);
    try {
      await api.post("/auth/mfa/verify", { code });
      toast.success("MFA enabled!");
      setStep("done");
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  if (!user) return <div className="max-w-md mx-auto px-4 py-8 text-center text-gray-500">Sign in to enable MFA</div>;

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Two-Factor Authentication</h1>
      {step === "enrol" && (
        <div className="bg-white border rounded-lg p-6 text-center">
          <p className="mb-4 text-gray-600">Protect your account with an authenticator app.</p>
          <button onClick={startEnrol} disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{loading ? "Preparing..." : "Set Up MFA"}</button>
        </div>
      )}
      {step === "verify" && (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <p className="text-sm text-gray-600">Scan this URI in your authenticator app (Google Authenticator, Authy, etc.)</p>
          <div className="bg-gray-50 p-3 rounded text-xs break-all font-mono">{otpauthUri}</div>
          <p className="text-sm text-gray-600">Or enter this secret manually: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{secret}</code></p>
          <hr />
          <p className="text-sm font-medium">Then enter the 6-digit code from your app:</p>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" className="w-full border rounded-lg px-4 py-2 text-center text-2xl tracking-widest" maxLength={6} />
          <button onClick={verifyCode} disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{loading ? "Verifying..." : "Verify & Enable"}</button>
        </div>
      )}
      {step === "done" && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-bold text-lg mb-2 text-green-700">MFA Enabled!</h2>
          <p className="text-sm text-gray-600 mb-4">Save these recovery codes somewhere safe. Each can be used only once to sign in if you lose access to your authenticator app.</p>
          <div className="bg-gray-50 p-3 rounded font-mono text-sm space-y-1">
            {recoveryCodes.map((rc, i) => <div key={i}>{rc.code}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
