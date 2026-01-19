"use client";

import { apiFetch, setToken } from "@/lib/api";
import type { AuthResponse } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch<AuthResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.token);
      router.push("/jobs");
    } catch (ex: any) {
      setErr(ex?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
      <h1 style={{ margin: 0 }}>Sign up</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
        />

        <button
          disabled={loading}
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
            cursor: "pointer",
          }}
        >
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      {err && (
        <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</div>
      )}
      <div style={{ fontSize: 13, color: "#666" }}>
        MVP note: password rules and validation are intentionally light.
      </div>
    </div>
  );
}
