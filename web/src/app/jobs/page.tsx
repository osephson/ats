"use client";

import { apiFetch, getToken } from "@/lib/api";
import type { Job, JobsListResponse, LastOpened, Tag } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";

const MAX_OPEN_TABS_SAFELY = 15;
const DEFAULT_PAGE_SIZE = 25;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function JobsPage() {
  const { ready } = useRequireAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [meta, setMeta] = useState<JobsListResponse["meta"] | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Read state from URL
  const selectedTags = useMemo(() => searchParams.getAll("tag"), [searchParams]);
  const page = useMemo(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    return Number.isFinite(p) ? Math.max(1, p) : 1;
  }, [searchParams]);
  const pageSize = useMemo(() => {
    const ps = parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10);
    return Number.isFinite(ps) ? clamp(ps, 1, 100) : DEFAULT_PAGE_SIZE;
  }, [searchParams]);

  function setQuery(next: Record<string, string | string[] | null>) {
    const sp = new URLSearchParams(searchParams.toString());

    for (const [k, v] of Object.entries(next)) {
      sp.delete(k);
      if (v === null) continue;
      if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
      else sp.set(k, v);
    }

    router.push(`${pathname}?${sp.toString()}`);
  }

  // client-side search only (doesn’t change server results)
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
    if (!ready) return;
    setErr(null);
    setLoading(true);

    try {
      const qs = new URLSearchParams();
      selectedTags.forEach((t) => qs.append("tag", t));
      qs.set("page", String(page));
      qs.set("pageSize", String(pageSize));

      const [jobsRes, tagsRes] = await Promise.all([
        apiFetch<JobsListResponse>(`/jobs?${qs.toString()}`),
        apiFetch<Tag[]>(`/tags`).catch(() => [] as Tag[]),
      ]);

      setJobs(jobsRes.items);
      setMeta(jobsRes.meta);
      setAllTags(tagsRes.map((t) => t.name));

      // reset selection when page/filter changes
      setSelectedIds(new Set());

      // fetch last opened for page items if signed in
      if (getToken() && jobsRes.items.length > 0) {
        const opened = await apiFetch<LastOpened[]>("/opens/last", {
          method: "POST",
          body: JSON.stringify({ jobUrlIds: jobsRes.items.map((j) => j.id) }),
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
  }, [ready, page, pageSize, selectedTags.join("|")]);

  function toggleTag(t: string) {
    const has = selectedTags.includes(t);
    const nextTags = has ? selectedTags.filter((x) => x !== t) : [...selectedTags, t];

    // When filter changes, reset to page 1
    setQuery({ tag: nextTags, page: "1", pageSize: String(pageSize) });
  }

  function goToPage(nextPage: number) {
    setQuery({ page: String(nextPage) });
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const j of filteredJobs) next.delete(j.id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const j of filteredJobs) next.add(j.id);
        return next;
      });
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
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

    for (let i = 0; i < openCount; i++) {
      window.open(selectedJobs[i].url, "_blank", "noopener,noreferrer");
    }

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
          setErr(`Opened first ${MAX_OPEN_TABS_SAFELY}. Copy URLs for the rest.`);
        }
      } catch (ex: any) {
        setErr(`Opened tabs, but failed to record opens: ${ex?.message || "error"}`);
      }
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

  if (!ready) return null;

  const totalPages = meta?.totalPages ?? 1;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div style={{ display: "grid", gap: 14, paddingBottom: 84 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <h1 style={{ margin: 0 }}>Browse jobs</h1>
          <div style={{ fontSize: 13, color: "#666" }}>
            {loading
              ? "Loading..."
              : `Page ${page} / ${totalPages} · Showing ${jobs.length} of ${meta?.totalCount ?? 0}`}
          </div>
        </div>

        <button onClick={load} style={btnStyle}>
          Refresh
        </button>
      </div>

      {err && <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</div>}

      {/* Controls */}
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search URL contains… (current page only)"
            style={{
              flex: 1,
              minWidth: 220,
              padding: 10,
              border: "1px solid #ddd",
              borderRadius: 10,
            }}
          />
          <button onClick={toggleSelectAllVisible} disabled={filteredJobs.length === 0} style={btnStyle}>
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
                onClick={() => setQuery({ tag: [], page: "1" })}
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

        {/* Pagination controls */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "#666" }}>
            Page size:
            <select
              value={pageSize}
              onChange={(e) => setQuery({ pageSize: e.target.value, page: "1" })}
              style={{ marginLeft: 8, padding: 6, borderRadius: 8, border: "1px solid #ddd" }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => goToPage(1)} disabled={!canPrev} style={btnStyle}>
              « First
            </button>
            <button onClick={() => goToPage(page - 1)} disabled={!canPrev} style={btnStyle}>
              ‹ Prev
            </button>
            <button onClick={() => goToPage(page + 1)} disabled={!canNext} style={btnStyle}>
              Next ›
            </button>
            <button onClick={() => goToPage(totalPages)} disabled={!canNext} style={btnStyle}>
              Last »
            </button>
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
                <th style={thStyle}>Uploaded by</th>
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
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <a
                            href={j.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              maxWidth: 520,
                              display: "inline-block",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={j.url}
                          >
                            {j.url}
                          </a>
                          <button onClick={() => copyUrl(j.url)} style={copyBtnStyle} title="Copy URL">
                            Copy
                          </button>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {j.tags.map((t) => (
                            <span key={t} style={tagPillStyle}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, color: "#444" }}>
                          {j.createdByUserEmail ?? "—"}
                        </span>
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
              <span style={{ color: "#666" }}> (opening capped to {MAX_OPEN_TABS_SAFELY})</span>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={copySelectedUrls} disabled={selectedJobs.length === 0} style={btnStyle}>
              Copy URLs
            </button>
            <button
              onClick={openSelected}
              disabled={selectedJobs.length === 0}
              style={{ ...btnStyle, borderColor: "#bbb", fontWeight: 700 }}
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

const copyBtnStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  background: "white",
  borderRadius: 8,
  padding: "6px 8px",
  cursor: "pointer",
  fontSize: 12,
};

const tagPillStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
  color: "#444",
  background: "white",
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
