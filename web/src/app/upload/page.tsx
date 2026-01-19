"use client";

import { apiFetch, getToken } from "@/lib/api";
import type { BulkUploadResponse } from "@/lib/types";
import { TagChips } from "@/components/TagChips";
import { TagPicker } from "@/components/TagPicker";
import { useMemo, useState } from "react";

export default function UploadPage() {
  const [urlsText, setUrlsText] = useState("");
  const [tags, setTags] = useState<string[]>(["react", ".net"]);
  const [result, setResult] = useState<BulkUploadResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parsedCount = useMemo(() => {
    return urlsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0).length;
  }, [urlsText]);

  async function onUpload() {
    setErr(null);
    setResult(null);

    if (!getToken()) {
      setErr("You need to sign in first (JWT token required). Go to /signin.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<BulkUploadResponse>("/jobs/bulk", {
        method: "POST",
        body: JSON.stringify({ urlsText, tags }),
      });
      setResult(res);
    } catch (ex: any) {
      setErr(ex?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h1 style={{ margin: 0 }}>Upload jobs (bulk URLs)</h1>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 13, color: "#666" }}>
          Paste up to <b>100</b> job URLs (one per line). Exact duplicates are reported.
        </div>
        <textarea
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          placeholder={"https://...\nhttps://...\n..."}
          rows={10}
          style={{
            width: "100%",
            padding: 10,
            border: "1px solid #ddd",
            borderRadius: 8,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        />
        <div style={{ fontSize: 13, color: "#666" }}>
          Parsed URLs: <b>{parsedCount}</b>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Tags for this batch</h3>
        <TagPicker value={tags} onChange={setTags} />
        <TagChips tags={tags} onRemove={removeTag} />
      </div>

      <button
        onClick={onUpload}
        disabled={loading}
        style={{
          padding: 12,
          borderRadius: 10,
          border: "1px solid #ddd",
          cursor: "pointer",
          width: "fit-content",
        }}
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      {err && <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</div>}

      {result && (
        <div style={{ display: "grid", gap: 14 }}>
          <h2 style={{ margin: 0 }}>Result</h2>

          <Section title={`Created (${result.created.length})`}>
            {result.created.length === 0 ? (
              <div style={{ color: "#666" }}>No new URLs created.</div>
            ) : (
              <ul>
                {result.created.map((c) => (
                  <li key={c.id}>
                    <a href={c.url} target="_blank" rel="noreferrer">
                      {c.url}
                    </a>{" "}
                    <span style={{ color: "#666" }}>[{c.tags.join(", ")}]</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={`Duplicates in paste (${result.duplicatesInPaste.length})`}>
            <ListOrEmpty items={result.duplicatesInPaste} />
          </Section>

          <Section title={`Duplicates existing (${result.duplicatesExisting.length})`}>
            <ListOrEmpty items={result.duplicatesExisting} />
          </Section>

          <Section title={`Invalid/Empty (${result.invalidOrEmpty.length})`}>
            <ListOrEmpty items={result.invalidOrEmpty} />
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function ListOrEmpty({ items }: { items: string[] }) {
  if (!items || items.length === 0) {
    return <div style={{ color: "#666" }}>None</div>;
  }
  return (
    <ul>
      {items.map((x, idx) => (
        <li key={`${x}-${idx}`}>{x}</li>
      ))}
    </ul>
  );
}
