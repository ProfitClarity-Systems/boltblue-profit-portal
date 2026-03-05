"use client";

import { Card } from "@/components/ui/Card";
import type { MasterFunnelData } from "../query";
import { mf } from "./styles";

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
  const wrap = highlight ? mf.stageHi : mf.stage;

  return (
    <div style={wrap}>
      {rightBadge ? (
        <div
          style={{
            ...mf.badgeBase,
            ...(rightBadge.tone === "warn" ? mf.badgeWarn : mf.badgeMuted),
          }}
        >
          {rightBadge.text}
        </div>
      ) : null}

      <div
        style={{
          fontSize: 11,
          letterSpacing: 0.35,
          color: "var(--text-muted)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 30,
          fontWeight: 950,
          lineHeight: 1.05,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>

      {subLine ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
          {subLine}
        </div>
      ) : null}
    </div>
  );
}

function ArrowPill({ pctValue }: { pctValue: number }) {
  const v = clamp(pctValue, 0, 100);

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
      <div style={mf.arrowPill.wrap}>
        <div style={mf.arrowPill.pct}>{formatPct(v)}</div>

        <div style={mf.arrowPill.divider} />

        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 5v12"
            stroke={mf.arrowPill.iconStroke}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M7 14l5 5 5-5"
            stroke={mf.arrowPill.iconStroke}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function Dial({ label, valuePct }: { label: string; valuePct: number }) {
  const v = clamp(valuePct, 0, 100);

  const size = 92;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;

  return (
    <div style={mf.dial.card}>
      <div style={mf.dial.label}>{label}</div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={mf.dial.trackStroke}
              strokeWidth={stroke}
              fill="transparent"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={mf.dial.progressStroke}
              strokeWidth={stroke}
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </svg>

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 950, fontVariantNumeric: "tabular-nums" }}>
              {formatPct(v)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MasterFunnelView({
  data,
  showTrafficStage,
}: {
  data: MasterFunnelViewData;
  showTrafficStage: boolean;
}) {
  const unqualifiedAppointments = Math.max(
    0,
    (data.appointments ?? 0) - (data.qualifiedAppointments ?? 0)
  );

  const trafficToLead = showTrafficStage ? pct(data.leads, data.traffic) : 0;
  const leadToQualified = pct(data.qualified, data.leads);
  const qualifiedToQualifiedAppt = pct(data.qualifiedAppointments, data.qualified);
  const qualifiedApptToSale = pct(data.sales, data.qualifiedAppointments);

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
      <Card style={mf.card}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          {showTrafficStage ? (
            <>
              <Stage label="Website Traffic" value={formatNumber(data.traffic)} />
              <ArrowPill pctValue={trafficToLead} />
            </>
          ) : null}

          <Stage label="Leads" value={formatNumber(data.leads)} />
          <ArrowPill pctValue={leadToQualified} />

          <Stage label="Qualified" value={formatNumber(data.qualified)} />
          <ArrowPill pctValue={qualifiedToQualifiedAppt} />

          <Stage
            label="Qualified Appointments"
            value={formatNumber(data.qualifiedAppointments)}
            rightBadge={{
              text: `${formatNumber(unqualifiedAppointments)} Unqualified`,
              tone: unqualifiedAppointments > 0 ? "warn" : "muted",
            }}
            subLine={`Total appointments: ${formatNumber(data.appointments)}`}
          />
          <ArrowPill pctValue={qualifiedApptToSale} />

          <Stage label="Sales" value={formatNumber(data.sales)} highlight />
        </div>
      </Card>

      <Card style={mf.card}>
        <div style={{ maxWidth: 250, margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Dial label="Lead → Sale %" valuePct={leadToSale} />
            <Dial label="Qualified → Sale %" valuePct={qualifiedToSale} />
          </div>
        </div>
      </Card>
    </div>
  );
}