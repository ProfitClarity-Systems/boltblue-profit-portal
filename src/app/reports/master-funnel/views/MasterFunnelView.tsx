"use client";

import { Card } from "@/components/ui/Card";
import type { MasterFunnelData } from "../query";

type MasterFunnelViewData = MasterFunnelData & {
  traffic: number;
};

function formatNumber(n: number) {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat().format(n);
}

function formatPct(n: number) {
  if (!Number.isFinite(n)) return "0.0%";
  return `${n.toFixed(1)}%`;
}

function pct(n: number, d: number) {
  if (!d) return 0;
  return (n / d) * 100;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function Stage({
  label,
  value,
  highlight,
  subLine,
  rightBadge,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  subLine?: string;
  rightBadge?: { text: string; tone?: "muted" | "warn" };
}) {
  const border = highlight
    ? "1px solid rgba(164,255,0,0.65)"
    : "1px solid rgba(255,255,255,0.10)";

  const glow = highlight
    ? "0 0 0 1px rgba(164,255,0,0.12), 0 0 28px rgba(164,255,0,0.10)"
    : "0 0 0 1px rgba(255,255,255,0.06)";

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 18,
        border,
        boxShadow: glow,
        background:
          "radial-gradient(1200px 260px at 50% 0%, rgba(164,255,0,0.08), transparent 60%), rgba(255,255,255,0.02)",
        padding: 20,
      }}
    >
      {rightBadge ? (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            fontSize: 12,
            color: rightBadge.tone === "warn" ? "rgba(255,210,120,0.95)" : "var(--text-muted)",
            border:
              rightBadge.tone === "warn"
                ? "1px solid rgba(255,210,120,0.35)"
                : "1px solid rgba(255,255,255,0.12)",
            borderRadius: 999,
            padding: "5px 10px",
            background: "rgba(0,0,0,0.18)",
            whiteSpace: "nowrap",
            backdropFilter: "blur(6px)",
          }}
        >
          {rightBadge.text}
        </div>
      ) : null}

      <div style={{ fontSize: 12, letterSpacing: 0.2, color: "var(--text-muted)" }}>
        {label}
      </div>

      <div style={{ marginTop: 10, fontSize: 34, fontWeight: 950, lineHeight: 1.05 }}>
        {value}
      </div>

      {subLine ? (
        <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
          {subLine}
        </div>
      ) : null}
    </div>
  );
}

function Arrow({ pct }: { pct: number }) {
  const v = clamp(pct, 0, 100);
  const glow = v > 0 ? "0 0 24px rgba(164,255,0,0.12)" : "none";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        padding: "12px 0",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: glow,
        }}
      >
        ↓
      </div>

      <div
        style={{
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.12)",
          padding: "7px 12px",
          fontSize: 13,
          fontWeight: 900,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
          boxShadow: glow,
        }}
      >
        {formatPct(v)}
      </div>
    </div>
  );
}

function Dial({
  label,
  valuePct,
}: {
  label: string;
  valuePct: number;
}) {
  const v = clamp(valuePct, 0, 100);
  // Use conic-gradient for ring + subtle lime glow
  const ringBg = `conic-gradient(rgba(164,255,0,0.95) ${v}%, rgba(255,255,255,0.10) 0)`;

  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "radial-gradient(900px 220px at 50% 0%, rgba(164,255,0,0.06), transparent 60%), rgba(255,255,255,0.02)",
        padding: 16,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
        {label}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: 999,
            background: ringBg,
            boxShadow: "0 0 28px rgba(164,255,0,0.12)",
            padding: 10,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 999,
              background: "rgba(10,10,10,0.65)",
              border: "1px solid rgba(255,255,255,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(6px)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 950 }}>
              {formatPct(v)}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Conversion
          </div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 950, lineHeight: 1.1 }}>
            {formatPct(v)}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
            Quick health check metric
          </div>
        </div>
      </div>
    </div>
  );
}

export function MasterFunnelView({ data }: { data: MasterFunnelViewData }) {
  const unqualifiedAppointments = Math.max(
    0,
    (data.appointments ?? 0) - (data.qualifiedAppointments ?? 0)
  );

  // Spine conversions (your preferred spine)
  const trafficToLead = pct(data.leads, data.traffic);
  const leadToQualified = pct(data.qualified, data.leads);
  const qualifiedToQualifiedAppt = pct(data.qualifiedAppointments, data.qualified);
  const qualifiedApptToSale = pct(data.sales, data.qualifiedAppointments);

  // Right-side dials (what your brother wants)
  const leadToSale = pct(data.sales, data.leads);
  const qualifiedToSale = pct(data.sales, data.qualified);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(380px, 1fr) 380px",
        gap: 14,
        alignItems: "start",
      }}
    >
      {/* Left: Funnel spine */}
      <Card
        style={{
          padding: 16,
          borderRadius: 20,
          background:
            "radial-gradient(1200px 420px at 50% -120px, rgba(164,255,0,0.09), transparent 60%), rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Stage label="Website Traffic" value={formatNumber(data.traffic)} />

        <Arrow pct={trafficToLead} />

        <Stage label="Leads" value={formatNumber(data.leads)} />

        <Arrow pct={leadToQualified} />

        <Stage label="Qualified" value={formatNumber(data.qualified)} />

        <Arrow pct={qualifiedToQualifiedAppt} />

        <Stage
          label="Qualified Appointments"
          value={formatNumber(data.qualifiedAppointments)}
          rightBadge={{
            text: `${formatNumber(unqualifiedAppointments)} Unqualified`,
            tone: unqualifiedAppointments > 0 ? "warn" : "muted",
          }}
          subLine={`Total appointments: ${formatNumber(data.appointments)}`}
        />

        <Arrow pct={qualifiedApptToSale} />

        <Stage label="Sales" value={formatNumber(data.sales)} highlight />
      </Card>

      {/* Right: two dials only */}
      <Card
        style={{
          padding: 16,
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(900px 360px at 50% -120px, rgba(164,255,0,0.07), transparent 60%), rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
          At-a-glance
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Dial label="Lead → Sale %" valuePct={leadToSale} />
          <Dial label="Qualified → Sale %" valuePct={qualifiedToSale} />
        </div>
      </Card>
    </div>
  );
}