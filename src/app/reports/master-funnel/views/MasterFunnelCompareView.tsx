"use client";

import { Card } from "@/components/ui/Card";
import type { CompareResult, MasterFunnelData } from "../query";
import { formatRangeLabel } from "../query";
import { mf } from "./styles";

function fmtInt(n: number) {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat().format(Math.round(n));
}

function fmtPct(n: number) {
  if (!Number.isFinite(n)) return "0.0%";
  return `${n.toFixed(1)}%`;
}

function pct(n: number, d: number) {
  if (!d) return 0;
  return (n / d) * 100;
}

/** % change relative to previous: (cur-prev)/prev * 100 */
function pctChange(cur: number, prev: number) {
  if (!prev) return cur ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}

function deltaPctText(cur: number, prev: number) {
  const d = pctChange(cur, prev);
  const sign = d > 0 ? "+" : "";
  return `${sign}${d.toFixed(1)}%`;
}

function toneForDelta(deltaText: string) {
  if (deltaText.startsWith("+")) return "rgba(164,255,0,0.85)";
  if (deltaText.startsWith("-")) return "rgba(255,90,90,0.95)";
  return "var(--text-muted)";
}

function Stage({
  label,
  value,
  highlight,
  subLine,
  rightBadge,
  underSubBadge,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  subLine?: string;
  rightBadge?: { text: string; tone?: "muted" | "warn" };
  underSubBadge?: { text: string; tone?: "muted" | "warn" };
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
          paddingRight: rightBadge ? 94 : 0,
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

      {underSubBadge ? (
        <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              ...mf.badgeBase,
              position: "static",
              ...(underSubBadge.tone === "warn" ? mf.badgeWarn : mf.badgeMuted),
            }}
          >
            {underSubBadge.text}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ArrowPill({ pctValue }: { pctValue: number }) {
  const v = Math.max(0, Math.min(100, pctValue));

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
      <div style={mf.arrowPill.wrap}>
        <div style={mf.arrowPill.pct}>{fmtPct(v)}</div>
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

/** Borderless dial body (outer card owns the border) */
function DialBare({ valuePct }: { valuePct: number }) {
  const v = Math.max(0, Math.min(100, valuePct));

  const size = 92;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;

  return (
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
            {fmtPct(v)}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Funnel delta pill (matches main comparison) */
function DeltaPill({ text }: { text: string }) {
  const color = toneForDelta(text);

  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
      <div
        style={{
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0.18)",
          padding: "7px 12px",
          fontSize: 12,
          fontWeight: 950,
          color,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>{text}</span>
        <span
          style={{
            color: "rgba(255,255,255,0.70)",
            fontWeight: 950,
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          →
        </span>
      </div>
    </div>
  );
}

type FunnelBlock =
  | {
      kind: "stage";
      key: string;
      label: string;
      curValue: number;
      prevValue: number;
      curBadge?: { text: string; tone?: "muted" | "warn" };
      prevBadge?: { text: string; tone?: "muted" | "warn" };
      curSubLine?: string;
      prevSubLine?: string;
      highlight?: boolean;
      moveBadgeUnderSubline?: boolean;
    }
  | {
      kind: "arrow";
      key: string;
      curPct: number;
      prevPct: number;
    };

function MetricCompareCard({
  title,
  currentPct,
  previousPct,
}: {
  title: string;
  currentPct: number;
  previousPct: number;
}) {
  const delta = deltaPctText(currentPct, previousPct);

  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.12)",
        padding: 14,
      }}
    >
      <div style={mf.dial.label}>{title}</div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 120px 1fr",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: 0.35,
              marginBottom: 10,
            }}
          >
            Previous
          </div>
          <DialBare valuePct={previousPct} />
        </div>

        {/* Make this delta look exactly like the main comparison pill */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ transform: "translateY(-6px)" }}>
            <DeltaPill text={delta} />
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: 0.35,
              marginBottom: 10,
            }}
          >
            Current
          </div>
          <DialBare valuePct={currentPct} />
        </div>
      </div>
    </div>
  );
}

export function MasterFunnelCompareView({
  funnelCompare,
  trafficCompare,
  showTrafficStage,
}: {
  funnelCompare: CompareResult<MasterFunnelData>;
  trafficCompare: CompareResult<number>;
  showTrafficStage: boolean;
}) {
  // previous on the left, current on the right
  const current = funnelCompare.current;
  const previous = funnelCompare.previous;

  const currentTraffic = trafficCompare.current;
  const previousTraffic = trafficCompare.previous;

  const previousUnqualifiedAppointments = Math.max(
    0,
    (previous.appointments ?? 0) - (previous.qualifiedAppointments ?? 0)
  );
  const currentUnqualifiedAppointments = Math.max(
    0,
    (current.appointments ?? 0) - (current.qualifiedAppointments ?? 0)
  );

  // Conversion rates per funnel step (each period)
  const previousTrafficToLead = showTrafficStage ? pct(previous.leads, previousTraffic) : 0;
  const currentTrafficToLead = showTrafficStage ? pct(current.leads, currentTraffic) : 0;

  const previousLeadToQualified = pct(previous.qualified, previous.leads);
  const currentLeadToQualified = pct(current.qualified, current.leads);

  const previousQualifiedToQualifiedAppt = pct(
    previous.qualifiedAppointments,
    previous.qualified
  );
  const currentQualifiedToQualifiedAppt = pct(
    current.qualifiedAppointments,
    current.qualified
  );

  const previousQualifiedApptToSale = pct(previous.sales, previous.qualifiedAppointments);
  const currentQualifiedApptToSale = pct(current.sales, current.qualifiedAppointments);

  const blocks: FunnelBlock[] = [];

  if (showTrafficStage) {
    blocks.push(
      {
        kind: "stage",
        key: "traffic",
        label: "Website Traffic",
        curValue: currentTraffic,
        prevValue: previousTraffic,
      },
      {
        kind: "arrow",
        key: "traffic_to_lead",
        curPct: currentTrafficToLead,
        prevPct: previousTrafficToLead,
      }
    );
  }

  blocks.push(
    {
      kind: "stage",
      key: "leads",
      label: "Leads",
      curValue: current.leads,
      prevValue: previous.leads,
    },
    {
      kind: "arrow",
      key: "lead_to_qualified",
      curPct: currentLeadToQualified,
      prevPct: previousLeadToQualified,
    },
    {
      kind: "stage",
      key: "qualified",
      label: "Qualified",
      curValue: current.qualified,
      prevValue: previous.qualified,
    },
    {
      kind: "arrow",
      key: "qualified_to_qa",
      curPct: currentQualifiedToQualifiedAppt,
      prevPct: previousQualifiedToQualifiedAppt,
    },
    {
      kind: "stage",
      key: "qa",
      label: "Qualified Appointments",
      curValue: current.qualifiedAppointments,
      prevValue: previous.qualifiedAppointments,
      curBadge: {
        text: `${fmtInt(currentUnqualifiedAppointments)} Unqualified`,
        tone: currentUnqualifiedAppointments > 0 ? "warn" : "muted",
      },
      prevBadge: {
        text: `${fmtInt(previousUnqualifiedAppointments)} Unqualified`,
        tone: previousUnqualifiedAppointments > 0 ? "warn" : "muted",
      },
      curSubLine: `Total appointments: ${fmtInt(current.appointments ?? 0)}`,
      prevSubLine: `Total appointments: ${fmtInt(previous.appointments ?? 0)}`,
      moveBadgeUnderSubline: true,
    },
    {
      kind: "arrow",
      key: "qa_to_sale",
      curPct: currentQualifiedApptToSale,
      prevPct: previousQualifiedApptToSale,
    },
    {
      kind: "stage",
      key: "sales",
      label: "Sales",
      curValue: current.sales,
      prevValue: previous.sales,
      highlight: true,
    }
  );

  // At-a-glance metrics (rates) for each period
  const currentLeadToSale = pct(current.sales, current.leads);
  const previousLeadToSale = pct(previous.sales, previous.leads);

  const currentQualifiedToSale = pct(current.sales, current.qualified);
  const previousQualifiedToSale = pct(previous.sales, previous.qualified);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(520px, 1fr) 380px",
        gap: 14,
        alignItems: "start",
      }}
    >
      {/* Left: compare funnels */}
      <Card style={mf.card}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 140px 1fr",
            gap: 14,
            alignItems: "start",
          }}
        >
          {/* Headers */}
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: 0.35,
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Previous • {formatRangeLabel(funnelCompare.previousRange)}
          </div>

          <div />

          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: 0.35,
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Current • {formatRangeLabel(funnelCompare.currentRange)}
          </div>

          {/* Body rows */}
          {blocks.map((b) => {
            if (b.kind === "arrow") {
              return (
                <div
                  key={b.key}
                  style={{
                    gridColumn: "1 / span 3",
                    display: "grid",
                    gridTemplateColumns: "1fr 140px 1fr",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <ArrowPill pctValue={b.prevPct} />
                  <div />
                  <ArrowPill pctValue={b.curPct} />
                </div>
              );
            }

            const deltaText = deltaPctText(b.curValue, b.prevValue);

            const prevUnderBadge = b.moveBadgeUnderSubline ? b.prevBadge : undefined;
            const curUnderBadge = b.moveBadgeUnderSubline ? b.curBadge : undefined;

            return (
              <div
                key={b.key}
                style={{
                  gridColumn: "1 / span 3",
                  display: "grid",
                  gridTemplateColumns: "1fr 140px 1fr",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <Stage
                  label={b.label}
                  value={fmtInt(b.prevValue)}
                  highlight={Boolean(b.highlight)}
                  rightBadge={b.moveBadgeUnderSubline ? undefined : b.prevBadge}
                  underSubBadge={prevUnderBadge}
                  subLine={b.prevSubLine}
                />

                <DeltaPill text={deltaText} />

                <Stage
                  label={b.label}
                  value={fmtInt(b.curValue)}
                  highlight={Boolean(b.highlight)}
                  rightBadge={b.moveBadgeUnderSubline ? undefined : b.curBadge}
                  underSubBadge={curUnderBadge}
                  subLine={b.curSubLine}
                />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Right: at-a-glance */}
      <Card style={mf.card}>
        <div style={{ maxWidth: 360, margin: "0 auto" }}>
          <div style={{ display: "grid", gap: 12 }}>
            <MetricCompareCard
              title="Lead → Sale %"
              currentPct={currentLeadToSale}
              previousPct={previousLeadToSale}
            />
            <MetricCompareCard
              title="Qualified → Sale %"
              currentPct={currentQualifiedToSale}
              previousPct={previousQualifiedToSale}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}