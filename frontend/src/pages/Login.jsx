import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

// Minimal login form — enough to get a session cookie for exercising the
// marketplace pages. MFA-enrolled accounts aren't handled here (no
// enrol/verify UI exists yet in this phase); this app is scoped to
// listings/search/cart, not the full auth flow Phase 1/2 already built
// server-side.
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { refresh } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await apiFetch("/auth/login", { method: "POST", body: { email, password } });
      if (result.mfaRequired) {
        setError("This account has MFA enabled — this minimal UI doesn't support MFA verification yet.");
        return;
      }
      await refresh();
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Log in</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={submitting}>
          Log in
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
