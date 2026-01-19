"use client";

import { useEffect, useState } from "react";
import { getToken } from "./api";
import { usePathname, useRouter } from "next/navigation";

export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setReady(true);
  }, [router, pathname]);

  return { ready };
}
