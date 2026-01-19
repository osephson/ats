"use client";

import { apiFetch, getToken } from "@/lib/api";
import type { Job, LastOpened, Tag } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const queryString = useMemo(() => {
    if (selectedTags.length === 0) return "";
    const qs = selectedTags.map((t) => `tag=${encodeURIComponent(t)}`).join("&");
    return `?${qs}`;
  }, [selectedTags]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const [jobsRes, tagsRes] = await Promise.all([
        apiFetch<Job[]>(`/jobs${queryString}`),
        apiFetch<Tag[]>(`/tags`).catch(() => [] as Tag[]),
      ]);

      setJobs(jobsRes);
      setAllTags(tagsRes.map((t) => t.name));

      // If signed in, fetch last-opened for visible jobs
      if (getToken() && jobsRes.length > 0) {
        const opened = await apiFetch<LastOpened[]>("/opens/last", {
          method: "POST",
          body: JSON.stringify({ jobUrlIds: jobsRes.map((j) => j.id) }),
        });

        const map = new Map(opened.map((o) => [o.jobUrlId, o.lastOpenedAt]));
        setJobs((prev) =>
          prev.map((j) => ({
            ...j,
            lastOpenedAt: map.get(j.id) ?? null,
          }))
        );
      }
    } catch (ex: any) {
      setErr(ex?.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedJobs = useMemo(
    () => jobs.filter((j) => selectedIds.has(j.id)),
    [jobs, selectedIds]
  );

  async function openSelected() {
    setErr(null);

    if (selectedJobs.length === 0) {
      setErr("Select at least one job URL first.");
      return;
    }

    // Open tabs (may be blocked if too many)
    for (const j of selectedJobs) {
      window.open(j.url, "_blank", "noopener,noreferrer");
    }

    // Record opens if logged in
    if (getToken()) {
      try {
        await apiFetch<{ inserted: number }>("/opens", {
          method: "POST",
          body: JSON.stringify({ jobUrlIds: selectedJobs.map((j) => j.id) }),
        });

        // Refresh last-opened for selected
        const opened = await apiFetch<LastOpened[]>("/opens/last", {
          method: "POST",
          body: JSON.stringify({ jobUrlIds: selectedJobs.map((j) => j.id) }),
        });
        const map = new Map(opened.map((o) => [o.jobUrlId, o.lastOpenedAt]));

        setJobs((prev) =>
          prev.map((j) => ({
            ...j,
            lastOpenedAt: map.get(j.id) ?? j.lastOpenedAt ?? null,
          }))
        );
      } catch (ex: any) {
        // still opened tabs; just show error for tracking
        setErr(`Opened tabs, but failed to record opens: ${ex?.message || "error"}`);
      }
    } else {
      setErr("Opened tabs. (Sign in if you want to track opened timestamps.)");
    }
  }

  function toggleTag(t: string) {
    setSelectedTags((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      return [...prev, t];
    });
    setSelectedIds(new Set()); // clear selection on filter change
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Browse jobs</h1>
        <button
          onClick={openSelected}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            cursor: "pointer",
          }}
        >
          Open selected ({selectedJobs.length})
        </button>
      </div>

      {err && <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</div>}

      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Filter by tags (AND)</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(allTags.length ? allTags : ["react", ".net", "angular", "python"]).map((t) => {
            const active = selectedTags.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #ddd",
                  cursor: "pointer",
                  background: active ? "#f3f3f3" : "white",
                }}
              >
                {active ? "✓ " : ""}{t}
              </button>
            );
          })}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #ddd",
                cursor: "pointer",
                background: "white",
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div style={{ color: "#666", fontSize: 13 }}>
        {loading ? "Loading..." : `Showing ${jobs.length} jobs`}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {jobs.map((j) => (
          <div
            key={j.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 12,
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={selectedIds.has(j.id)}
                onChange={() => toggleSelected(j.id)}
              />
              <a href={j.url} target="_blank" rel="noreferrer">
                {j.url}
              </a>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {j.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    border: "1px solid #ddd",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 12,
                    color: "#444",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>

            <div style={{ fontSize: 12, color: "#666" }}>
              Created: {new Date(j.createdAt).toLocaleString()}
              {" · "}
              Last opened (you):{" "}
              {j.lastOpenedAt ? new Date(j.lastOpenedAt).toLocaleString() : "—"}
            </div>
          </div>
        ))}

        {jobs.length === 0 && !loading && (
          <div style={{ color: "#666" }}>No jobs found for current filters.</div>
        )}
      </div>
    </div>
  );
}
