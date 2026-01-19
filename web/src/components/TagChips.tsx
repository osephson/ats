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
            border: "1px solid #ddd",
            padding: "4px 8px",
            borderRadius: 999,
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
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
