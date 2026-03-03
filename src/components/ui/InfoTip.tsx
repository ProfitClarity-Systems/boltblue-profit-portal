"use client";

import { useId, useState } from "react";

export function InfoTip({
  text,
  ariaLabel = "Info",
}: {
  text: string;
  ariaLabel?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-describedby={open ? id : undefined}
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(255,255,255,0.04)",
          color: "var(--text-muted)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 900,
          lineHeight: 1,
          cursor: "help",
        }}
      >
        i
      </button>

      {open ? (
        <div
          id={id}
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            left: 0,
            zIndex: 50,
            width: 320,
            maxWidth: "min(320px, 70vw)",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(10,10,10,0.92)",
            color: "rgba(255,255,255,0.88)",
            fontSize: 12,
            lineHeight: 1.35,
            boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
            backdropFilter: "blur(8px)",
            whiteSpace: "pre-line",
          }}
        >
          {text}
        </div>
      ) : null}
    </span>
  );
}