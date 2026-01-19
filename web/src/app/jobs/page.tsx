"use client";

import { apiFetch, getToken } from "@/lib/api";
import type { Job, LastOpened, Tag } from "@/lib/types";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useEffect, useMemo, useState } from "react";

const MAX_OPEN_TABS_SAFELY = 15;

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const queryString = useMemo(() => {
    const qs: string[] = [];
    for (const t of selectedTags) qs.push(`tag=${encodeURIComponent(t)}`);
    return qs.length ? `?${qs.join("&")}` : "";
  }, [selectedTags]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => j.url.toLowerCase().includes(q));
  }, [jobs, search]);

  const selectedJobs = useMemo(
    () => filteredJobs.filter((j) => selectedIds.has(j.id)),
    [filteredJobs, selectedIds]
  );

  const allVisibleSelected = useMemo(() => {
    if (filteredJobs.length === 0) return false;
    return filteredJobs.every((j) => selectedIds.has(j.id));
  }, [filteredJobs, selectedIds]);

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

      // reset selection on data refresh
      setSelectedIds(new Set());

      // fetch last opened for visible jobs if signed in
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

  function toggleTag(t: string) {
    setSelectedTags((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      return [...prev, t];
    });
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const j of filteredJobs) next.add(j.id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      // unselect visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const j of filteredJobs) next.delete(j.id);
        return next;
      });
    } else {
      selectAllVisible();
    }
  }

  async function copySelectedUrls() {
    const urls = selectedJobs.map((j) => j.url).join("\n");
    try {
      await navigator.clipboard.writeText(urls);
      setErr(`Copied ${selectedJobs.length} URLs to clipboard.`);
      setTimeout(() => setErr(null), 1500);
    } catch {
      setErr("Failed to copy. (Your browser may block clipboard access.)");
    }
  }

  async function openSelected() {
    setErr(null);

    if (selectedJobs.length === 0) {
      setErr("Select at least one job URL first.");
      return;
    }

    const openCount = Math.min(selectedJobs.length, MAX_OPEN_TABS_SAFELY);
    const tooMany = selectedJobs.length > MAX_OPEN_TABS_SAFELY;

    // Open tabs (likely blocked if too many)
    for (let i = 0; i < openCount; i++) {
      window.open(selectedJobs[i].url, "_blank", "noopener,noreferrer");
    }

    // Record opens if logged in
    if (getToken()) {
      try {
        await apiFetch<{ inserted: number }>("/opens", {
          method: "POST",
          body: JSON.stringify({ jobUrlIds: selectedJobs.slice(0, openCount).map((j) => j.id) }),
        });

        const opened = await apiFetch<LastOpened[]>("/opens/last", {
          method: "POST",
          body: JSON.stringify({ jobUrlIds: selectedJobs.slice(0, openCount).map((j) => j.id) }),
        });

        const map = new Map(opened.map((o) => [o.jobUrlId, o.lastOpenedAt]));
        setJobs((prev) =>
          prev.map((j) => ({
            ...j,
            lastOpenedAt: map.get(j.id) ?? j.lastOpenedAt ?? null,
          }))
        );

        if (tooMany) {
          setErr(
            `Opened first ${MAX_OPEN_TABS_SAFELY}. To avoid popup blockers, copy URLs for the rest.`
          );
        }
      } catch (ex: any) {
        setErr(`Opened tabs, but failed to record opens: ${ex?.message || "error"}`);
      }
    } else {
      setErr(
        tooMany
          ? `Opened first ${MAX_OPEN_TABS_SAFELY}. Sign in to track opens and copy URLs for the rest.`
          : "Opened tabs. (Sign in if you want to track opened timestamps.)"
      );
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setErr("Copied URL.");
      setTimeout(() => setErr(null), 1200);
    } catch {
      setErr("Failed to copy URL.");
    }
  }

  const { ready } = useRequireAuth();
  if (!ready) return null;

  return (
    <div style={{ display: "grid", gap: 14, paddingBottom: 84 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <h1 style={{ margin: 0 }}>Browse jobs</h1>
          <div style={{ fontSize: 13, color: "#666" }}>
            {loading ? "Loading..." : `Showing ${filteredJobs.length} jobs`}
            {selectedTags.length ? ` (filtered by tags)` : ""}
          </div>
        </div>

        <button
          onClick={load}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "white",
            cursor: "pointer",
            height: "fit-content",
          }}
        >
          Refresh
        </button>
      </div>

      {err && <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</div>}

      {/* Controls */}
      <div style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 12,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search URL contains…"
              style={{
                flex: 1,
                minWidth: 220,
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 10,
              }}
            />
            <button
              onClick={toggleSelectAllVisible}
              disabled={filteredJobs.length === 0}
              style={btnStyle}
            >
              {allVisibleSelected ? "Unselect page" : "Select page"}
            </button>
            <button onClick={clearSelection} disabled={selectedIds.size === 0} style={btnStyle}>
              Clear
            </button>
          </div>

          <div>
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
                  Clear tags
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={thStyle}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    disabled={filteredJobs.length === 0}
                    title="Select all on this page"
                  />
                </th>
                <th style={thStyle}>URL</th>
                <th style={thStyle}>Tags</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Last opened (you)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 14, color: "#666" }}>
                    No jobs found.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((j) => {
                  const checked = selectedIds.has(j.id);
                  return (
                    <tr key={j.id} style={{ borderTop: "1px solid #eee" }}>
                      <td style={tdStyle}>
                        <input type="checkbox" checked={checked} onChange={() => toggleOne(j.id)} />
                      </td>

                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
                          <a
                            href={j.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              maxWidth: 800,
                              display: "inline-block",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={j.url}
                          >
                            {j.url}
                          </a>
                          <button
                            onClick={() => copyUrl(j.url)}
                            style={{
                              border: "1px solid #ddd",
                              background: "white",
                              borderRadius: 8,
                              padding: "6px 8px",
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                            title="Copy URL"
                          >
                            Copy
                          </button>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {j.tags.map((t) => (
                            <span
                              key={t}
                              style={{
                                border: "1px solid #ddd",
                                padding: "2px 8px",
                                borderRadius: 999,
                                fontSize: 12,
                                color: "#444",
                                background: "white",
                              }}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, color: "#444" }}>
                          {new Date(j.createdAt).toLocaleString()}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, color: "#444" }}>
                          {j.lastOpenedAt ? new Date(j.lastOpenedAt).toLocaleString() : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky footer action bar */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          borderTop: "1px solid #eee",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: 12,
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 13, color: "#444" }}>
            Selected: <b>{selectedJobs.length}</b>
            {selectedJobs.length > MAX_OPEN_TABS_SAFELY ? (
              <span style={{ color: "#666" }}>
                {" "}
                (opening will be capped to {MAX_OPEN_TABS_SAFELY})
              </span>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={copySelectedUrls}
              disabled={selectedJobs.length === 0}
              style={btnStyle}
              title="Copy selected URLs (newline separated)"
            >
              Copy URLs
            </button>

            <button
              onClick={openSelected}
              disabled={selectedJobs.length === 0}
              style={{
                ...btnStyle,
                borderColor: "#bbb",
                fontWeight: 700,
              }}
            >
              Open selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: 10,
  fontSize: 12,
  color: "#666",
  borderBottom: "1px solid #eee",
};

const tdStyle: React.CSSProperties = {
  padding: 10,
  verticalAlign: "top",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
};

function SkeletonRows() {
  const rows = Array.from({ length: 8 });
  return (
    <>
      {rows.map((_, idx) => (
        <tr key={idx} style={{ borderTop: "1px solid #eee" }}>
          <td style={tdStyle}>
            <div style={{ width: 14, height: 14, border: "1px solid #ddd", borderRadius: 3 }} />
          </td>
          <td style={tdStyle}>
            <div style={{ height: 12, width: "85%", background: "#f2f2f2", borderRadius: 6 }} />
          </td>
          <td style={tdStyle}>
            <div style={{ height: 12, width: 140, background: "#f2f2f2", borderRadius: 6 }} />
          </td>
          <td style={tdStyle}>
            <div style={{ height: 12, width: 120, background: "#f2f2f2", borderRadius: 6 }} />
          </td>
          <td style={tdStyle}>
            <div style={{ height: 12, width: 120, background: "#f2f2f2", borderRadius: 6 }} />
          </td>
        </tr>
      ))}
    </>
  );
}
