"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Tag } from "@/lib/types";

const DEFAULT_SUGGESTIONS = ["react", ".net", "angular", "python", "java"];

export function TagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [allTags, setAllTags] = useState<string[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    // best-effort; if API down it's fine
    apiFetch<Tag[]>("/tags")
      .then((rows) => setAllTags(rows.map((r) => r.name)))
      .catch(() => setAllTags([]));
  }, []);

  const suggestions = useMemo(() => {
    const merged = Array.from(
      new Set([...DEFAULT_SUGGESTIONS, ...allTags])
    ).sort();
    return merged.filter((t) => !value.includes(t));
  }, [allTags, value]);

  function addTag(raw: string) {
    const t = raw.trim();
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a tag (e.g., react, .net, custom...)"
          style={{ flex: 1, padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(input);
              setInput("");
            }
          }}
        />
        <button
          onClick={() => {
            addTag(input);
            setInput("");
          }}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ddd",
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {suggestions.slice(0, 20).map((t) => (
          <button
            key={t}
            onClick={() => addTag(t)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #ddd",
              background: "white",
              cursor: "pointer",
            }}
          >
            + {t}
          </button>
        ))}
      </div>
    </div>
  );
}
