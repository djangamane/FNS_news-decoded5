import React, { useState } from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3002";
const SESSION_KEY = "fns.admin.unlocked";

/**
 * Password gate for the admin dashboard.
 *
 * The password is never shipped to the browser: what the user types is sent to
 * the backend's basic-auth protected /api/admin/status, and only the resulting
 * 200 or 401 comes back. The unlock is remembered for the tab session only.
 *
 * This guards the dashboard UI. It is not a substitute for row level security
 * on Supabase, since the anon key in the bundle can still be used directly.
 */
const AdminGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const attempt = async (event: React.FormEvent) => {
    event.preventDefault();
    setChecking(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/status`, {
        headers: { Authorization: `Basic ${btoa(`admin:${password}`)}` },
      });

      if (response.ok) {
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          // A blocked sessionStorage only costs a re-prompt on reload.
        }
        setUnlocked(true);
        return;
      }

      setError(
        response.status === 401
          ? "Incorrect password."
          : `Could not verify (status ${response.status}).`,
      );
    } catch {
      setError("Could not reach the authentication service.");
    } finally {
      setChecking(false);
      setPassword("");
    }
  };

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <form
        onSubmit={attempt}
        className="w-full max-w-sm bg-gray-800/70 border border-green-500/40 rounded-lg p-6 space-y-4"
      >
        <h1 className="text-2xl font-bold text-green-400">Restricted</h1>
        <p className="text-sm text-green-600">
          Enter the admin password to continue.
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          className="w-full px-3 py-2 rounded bg-gray-900 border border-green-500/40 text-green-300 focus:outline-none focus:border-green-400"
        />

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={checking || password.length === 0}
          className="w-full px-4 py-2 rounded bg-green-600 text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-500"
        >
          {checking ? "Checking..." : "Unlock"}
        </button>
      </form>
    </div>
  );
};

export default AdminGate;
