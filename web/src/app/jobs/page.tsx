import { Suspense } from "react";
import JobsClient from "./JobsClient";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      <JobsClient />
    </Suspense>
  );
}
