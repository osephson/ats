"use client";

import Link from "next/link";
import { clearToken, clearUser, getToken, getUser, setUser } from "@/lib/api";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function TopBar() {
  const [hasToken, setHasToken] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setHasToken(!!getToken());
    setUserEmail(getUser());
  }, [pathname]);

  return (
    <div style={{ borderBottom: "1px solid #eee", padding: 12 }}>
      <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/jobs" style={{ fontWeight: 700 }}>
          ATS Jobs
        </Link>
        {hasToken && (
          <>
            <Link href="/jobs">Jobs</Link>
            <Link href="/upload">Upload</Link>
          </>
        )}


        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          {hasToken ? (
            <>
              <span style={{ fontSize: 13, color: "#666" }}>Signed in <b>{userEmail}</b></span>
              <button
                onClick={() => {
                  clearToken();
                  setHasToken(false);
                  setUserEmail(null);
                  clearUser();
                  router.push("/");
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  cursor: "pointer",
                  background: "white",
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/signin">Sign in</Link>
              <Link href="/signup">Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
