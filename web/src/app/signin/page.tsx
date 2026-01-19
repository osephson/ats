"use client";

import { apiFetch, setToken } from "@/lib/api";
import type { AuthResponse } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function isEmailLike(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailTrim = email.trim();
  const passwordTrim = password;

  const emailError = useMemo(() => {
    if (!emailTrim) return "Email is required";
    if (!isEmailLike(emailTrim)) return "Please enter a valid email";
    return null;
  }, [emailTrim]);

  const passwordError = useMemo(() => {
    if (!passwordTrim) return "Password is required";
    return null;
  }, [passwordTrim]);

  const canSubmit = !loading && !emailError && !passwordError;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (emailError || passwordError) {
      setErr([emailError, passwordError].filter(Boolean).join("\n"));
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<AuthResponse>("/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email: emailTrim, password: passwordTrim }),
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
      <h1 style={{ margin: 0 }}>Sign in</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8, outline: "none" }}
          />
          {emailError && <div style={{ color: "crimson", fontSize: 12 }}>{emailError}</div>}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8, outline: "none" }}
          />
          {passwordError && <div style={{ color: "crimson", fontSize: 12 }}>{passwordError}</div>}
        </div>

        <button
          disabled={!canSubmit}
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.6,
          }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {err && <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</div>}
    </div>
  );
}
