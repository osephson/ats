"use client";

import React from "react";

export function TagChips({
  tags,
  onRemove,
}: {
  tags: string[];
  onRemove: (tag: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {tags.map((t) => (
        <span
          key={t}
          style={{
            border: "1px solid #1d4ed8",
            padding: "4px 8px",
            borderRadius: 999,
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
            background: "#2563eb",
            color: "white",
          }}
        >
          <span>{t}</span>
          <button
            onClick={() => onRemove(t)}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 14,
              color: "inherit",
            }}
            aria-label={`remove ${t}`}
            title="Remove"
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}
