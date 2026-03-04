"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { SecondaryButton } from "@/components/ui/SecondaryButton";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYYYYMMDD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatLabel(d: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function safeDateFromYMD(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function DateRangePicker(props: {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onChange: (next: { startDate: string; endDate: string }) => void;

  /**
   * When true, the RANGE pill highlights lime.
   * Use this to show "custom range is active".
   * If omitted, it falls back to highlighting whenever a committed range exists.
   */
  isActive?: boolean;
}) {
  const { startDate, endDate, onChange, isActive } = props;

  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(undefined);

  const committed: DateRange | undefined = useMemo(() => {
    const from = safeDateFromYMD(startDate) ?? undefined;
    const to = safeDateFromYMD(endDate) ?? undefined;
    if (!from) return undefined;
    if (!to) return { from };
    return { from, to };
  }, [startDate, endDate]);

  useEffect(() => {
    if (!open) return;
    setDraft(committed);
  }, [open, committed]);

  const label = useMemo(() => {
    const from = committed?.from;
    const to = committed?.to;
    if (!from) return "Select range";
    if (!to) return `${formatLabel(from)} → …`;
    return `${formatLabel(from)} → ${formatLabel(to)}`;
  }, [committed]);

  const fromLabel = useMemo(() => {
    const from = draft?.from;
    return from ? formatLabel(from) : "—";
  }, [draft]);

  const toLabel = useMemo(() => {
    const to = draft?.to;
    return to ? formatLabel(to) : "—";
  }, [draft]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const el = anchorRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function applyDraft() {
    const from = draft?.from;
    if (!from) return;
    const to = draft?.to ?? from;
    onChange({ startDate: toYYYYMMDD(from), endDate: toYYYYMMDD(to) });
    setOpen(false);
  }

  function clearSelection() {
    setDraft(undefined);
    onChange({ startDate: "", endDate: "" });
  }

  const defaultMonth = useMemo(() => {
    return draft?.from ?? committed?.from ?? new Date();
  }, [draft?.from, committed?.from]);

  // If parent provides isActive, use it. Otherwise fall back to old behavior.
  const highlight = isActive ?? Boolean(committed?.from && committed?.to);

  const canApply = Boolean(draft?.from);

  return (
    <div ref={anchorRef} style={{ position: "relative" }}>
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          height: 44,
          padding: "0 18px",
          borderRadius: 999,
          border: highlight
            ? "1px solid var(--lime)"
            : "1px solid rgba(255,255,255,0.18)",
          background: "transparent",
          color: highlight ? "var(--lime)" : "rgba(255,255,255,0.85)",
          fontWeight: 800,
          letterSpacing: 0.2,
          cursor: "pointer",
          userSelect: "none",
          transition: "border-color 140ms ease, color 140ms ease",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            color: highlight ? "var(--lime)" : "rgba(255,255,255,0.55)",
            fontSize: 11,
            letterSpacing: 1,
            fontWeight: 900,
          }}
        >
          RANGE
        </span>
        <span style={{ fontSize: 13 }}>{label}</span>
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 10px)",
            zIndex: 50,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(10,10,10,0.96)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
            padding: 14,
            minWidth: 440,
          }}
        >
          <style>{`
            .pp-rdp, .pp-rdp * { box-sizing: border-box; }

            .pp-rdp table,
            .pp-rdp thead,
            .pp-rdp tbody,
            .pp-rdp tr,
            .pp-rdp th,
            .pp-rdp td {
              background: transparent !important;
              border: none !important;
            }

            .pp-rdp button {
              appearance: none !important;
              -webkit-appearance: none !important;
              border: none !important;
              background: transparent !important;
              padding: 0 !important;
              margin: 0 !important;
              font: inherit !important;
              color: inherit !important;
            }

            .pp-months { display: flex; }
            .pp-month { width: 100%; }

            .pp-caption {
              display: flex;
              align-items: center;
              justify-content: flex-start;
              gap: 14px;
              margin: 2px 0 10px 0;
              padding: 0 2px;
            }

            .pp-captionLabel {
              font-weight: 950;
              letter-spacing: 0.2px;
              color: rgba(255,255,255,0.92);
              margin-left: 8px;
            }

            .pp-nav { display: inline-flex; gap: 8px; }

            .pp-rdp .pp-nav button,
            .pp-rdp .pp-navBtn {
              width: 34px !important;
              height: 34px !important;
              border-radius: 999px !important;
              border: 1px solid rgba(255,255,255,0.18) !important;
              background: transparent !important;
              display: inline-flex !important;
              align-items: center !important;
              justify-content: center !important;
              color: rgba(255,255,255,0.85) !important;
              cursor: pointer !important;
              transition: border-color 140ms ease, color 140ms ease !important;
              position: relative !important;
              flex: 0 0 auto;
            }

            .pp-rdp .pp-nav button:hover,
            .pp-rdp .pp-navBtn:hover {
              border-color: var(--lime) !important;
              color: var(--lime) !important;
              background: transparent !important;
              box-shadow: none !important;
              transform: none !important;
            }

            .pp-rdp .pp-nav button svg { display: none !important; }
            .pp-rdp .pp-nav button[aria-label*="Previous"]::before,
            .pp-rdp .pp-nav button[aria-label*="previous"]::before {
              content: "‹";
              font-size: 18px;
              font-weight: 950;
              line-height: 1;
              transform: translateY(-1px);
              opacity: 0.95;
            }
            .pp-rdp .pp-nav button[aria-label*="Next"]::before,
            .pp-rdp .pp-nav button[aria-label*="next"]::before {
              content: "›";
              font-size: 18px;
              font-weight: 950;
              line-height: 1;
              transform: translateY(-1px);
              opacity: 0.95;
            }

            .pp-table {
              width: 100%;
              border-collapse: separate !important;
              border-spacing: 6px !important;
            }

            .pp-headCell {
              color: rgba(255,255,255,0.55);
              font-weight: 900;
              font-size: 11px;
              letter-spacing: 1px;
              text-align: center;
              padding: 0 0 4px 0;
            }

            .pp-cell {
              background: transparent !important;
              padding: 0 !important;
              border: none !important;
              text-align: center;
            }

            .pp-dayBtn {
              width: 40px !important;
              height: 40px !important;
              border-radius: 999px !important;
              display: inline-flex !important;
              align-items: center !important;
              justify-content: center !important;

              background: transparent !important;
              border: 1px solid rgba(255,255,255,0.12) !important;
              color: rgba(255,255,255,0.88) !important;
              font-weight: 850 !important;

              cursor: pointer !important;
              user-select: none !important;
              transition: border-color 140ms ease, color 140ms ease, background-color 140ms ease !important;
              position: relative !important;
              z-index: 2 !important;
            }

            .pp-dayBtn:hover {
              border-color: var(--lime) !important;
              color: var(--lime) !important;
              background: transparent !important;
              box-shadow: none !important;
              transform: none !important;
            }

            .pp-today .pp-dayBtn {
              border-color: rgba(255,255,255,0.22) !important;
            }

            .pp-disabled .pp-dayBtn {
              opacity: 0.28 !important;
              cursor: not-allowed !important;
              box-shadow: none !important;
            }

            .pp-rangeMid .pp-dayBtn {
              background: rgba(164,255,0,0.10) !important;
              border-color: rgba(164,255,0,0.18) !important;
              color: rgba(255,255,255,0.92) !important;
            }

            .pp-selected .pp-dayBtn,
            .pp-rangeStart .pp-dayBtn,
            .pp-rangeEnd .pp-dayBtn {
              background: var(--lime) !important;
              border-color: var(--lime) !important;
              color: rgba(10,10,10,0.92) !important;
              box-shadow: none !important;
              font-weight: 950 !important;
            }

            .pp-dayBtn:focus-visible,
            .pp-rdp .pp-nav button:focus-visible,
            .pp-navBtn:focus-visible {
              outline: none !important;
              box-shadow: none !important;
              border-color: var(--lime) !important;
            }
          `}</style>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1,
                  fontWeight: 900,
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                FROM
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontWeight: 950,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {fromLabel}
              </div>
            </div>

            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1,
                  fontWeight: 900,
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                TO
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontWeight: 950,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {toLabel}
              </div>
            </div>
          </div>

          <DayPicker
            mode="range"
            selected={draft}
            onSelect={(range) => setDraft(range)}
            numberOfMonths={1}
            defaultMonth={defaultMonth}
            showOutsideDays={false}
            weekStartsOn={1}
            className="pp-rdp"
            classNames={{
              months: "pp-months",
              month: "pp-month",
              caption: "pp-caption",
              caption_label: "pp-captionLabel",
              nav: "pp-nav",
              nav_button: "pp-navBtn",
              table: "pp-table",
              head_cell: "pp-headCell",
              cell: "pp-cell",
              day_button: "pp-dayBtn",
            }}
            modifiersClassNames={{
              selected: "pp-selected",
              range_start: "pp-rangeStart",
              range_end: "pp-rangeEnd",
              range_middle: "pp-rangeMid",
              today: "pp-today",
              disabled: "pp-disabled",
            }}
          />

          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 8,
            }}
          >
            <SecondaryButton type="button" size="sm" onClick={clearSelection}>
              Clear
            </SecondaryButton>

            <button
              type="button"
              onClick={applyDraft}
              disabled={!canApply}
              style={{
                height: 34,
                padding: "0 14px",
                borderRadius: 999,
                border: "1px solid var(--lime)",
                background: canApply ? "var(--lime)" : "rgba(164,255,0,0.25)",
                color: "rgba(10,10,10,0.92)",
                fontWeight: 950,
                letterSpacing: 0.2,
                cursor: canApply ? "pointer" : "not-allowed",
                opacity: canApply ? 1 : 0.6,
                transition: "opacity 140ms ease, background-color 140ms ease",
              }}
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}