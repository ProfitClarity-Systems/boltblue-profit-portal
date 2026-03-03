"use client";

import { Card } from "@/components/ui/Card";
import type { CompareResult, MasterFunnelData } from "../query";
import { formatRangeLabel } from "../query";

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
function pctChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
function deltaIntText(current: number, previous: number) {
  const d = current - previous;
  const sign = d > 0 ? "+" : "";
  return `${sign}${fmtInt(d)}`;
}
function ppDeltaText(currentPct: number, prevPct: number) {
  const d = currentPct - prevPct;
  const sign = d > 0 ? "+" : "";
  return `${sign}${d.toFixed(1)}pp`;
}

function MiniDial({
  label,
  valuePct,
  deltaPp,
}: {
  label: string;
  valuePct: number;
  deltaPp: string;
}) {
  const v = Math.max(0, Math.min(100, valuePct));
  const ringBg = `conic-gradient(rgba(164,255,0,0.95) ${v}%, rgba(255,255,255,0.10) 0)`;

  const deltaTone =
    deltaPp.startsWith("+")
      ? "rgba(164,255,0,0.95)"
      : deltaPp.startsWith("-")
      ? "rgba(255,210,120,0.95)"
      : "var(--text-muted)";

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
            width: 84,
            height: 84,
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
            <div style={{ fontSize: 16, fontWeight: 950 }}>{fmtPct(v)}</div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Vs previous</div>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 950, color: deltaTone }}>
            {deltaPp}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
            Percentage point change
          </div>
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
  const cur = funnelCompare.current;
  const prev = funnelCompare.previous;

  const curTraffic = trafficCompare.current;
  const prevTraffic = trafficCompare.previous;

  const rows: Array<{
    label: string;
    current: number;
    previous: number;
    delta: string;
    changePct: string;
  }> = [];

  if (showTrafficStage) {
    rows.push({
      label: "Website Traffic",
      current: curTraffic,
      previous: prevTraffic,
      delta: deltaIntText(curTraffic, prevTraffic),
      changePct: fmtPct(pctChange(curTraffic, prevTraffic)),
    });
  }

  rows.push(
    {
      label: "Leads",
      current: cur.leads,
      previous: prev.leads,
      delta: deltaIntText(cur.leads, prev.leads),
      changePct: fmtPct(pctChange(cur.leads, prev.leads)),
    },
    {
      label: "Qualified",
      current: cur.qualified,
      previous: prev.qualified,
      delta: deltaIntText(cur.qualified, prev.qualified),
      changePct: fmtPct(pctChange(cur.qualified, prev.qualified)),
    },
    {
      label: "Qualified Appointments",
      current: cur.qualifiedAppointments,
      previous: prev.qualifiedAppointments,
      delta: deltaIntText(cur.qualifiedAppointments, prev.qualifiedAppointments),
      changePct: fmtPct(pctChange(cur.qualifiedAppointments, prev.qualifiedAppointments)),
    },
    {
      label: "Sales",
      current: cur.sales,
      previous: prev.sales,
      delta: deltaIntText(cur.sales, prev.sales),
      changePct: fmtPct(pctChange(cur.sales, prev.sales)),
    }
  );

  // Derived rates
  const curLeadToSale = pct(cur.sales, cur.leads);
  const prevLeadToSale = pct(prev.sales, prev.leads);

  const curQualifiedToSale = pct(cur.sales, cur.qualified);
  const prevQualifiedToSale = pct(prev.sales, prev.qualified);

  const curTrafficToLead = showTrafficStage ? pct(cur.leads, curTraffic) : 0;
  const prevTrafficToLead = showTrafficStage ? pct(prev.leads, prevTraffic) : 0;

  const rateRows: Array<{
    label: string;
    current: number;
    previous: number;
    deltaPp: string;
  }> = [];

  if (showTrafficStage) {
    rateRows.push({
      label: "Traffic → Lead",
      current: curTrafficToLead,
      previous: prevTrafficToLead,
      deltaPp: ppDeltaText(curTrafficToLead, prevTrafficToLead),
    });
  }

  rateRows.push(
    {
      label: "Lead → Sale",
      current: curLeadToSale,
      previous: prevLeadToSale,
      deltaPp: ppDeltaText(curLeadToSale, prevLeadToSale),
    },
    {
      label: "Qualified → Sale",
      current: curQualifiedToSale,
      previous: prevQualifiedToSale,
      deltaPp: ppDeltaText(curQualifiedToSale, prevQualifiedToSale),
    }
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(520px, 1fr) 380px",
        gap: 14,
        alignItems: "start",
      }}
    >
      {/* Left: tables */}
      <Card
        style={{
          padding: 16,
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(900px 360px at 50% -120px, rgba(164,255,0,0.06), transparent 60%), rgba(255,255,255,0.02)",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 950 }}>Compare</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
            Current: {formatRangeLabel(funnelCompare.currentRange)} • Previous:{" "}
            {formatRangeLabel(funnelCompare.previousRange)}
          </div>
        </div>

        <div style={{ height: 12 }} />

        {/* Counts header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 110px 110px 90px 90px",
            gap: 10,
            padding: "0 12px",
            marginBottom: 8,
            fontSize: 11,
            letterSpacing: 0.3,
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          <div>Metric</div>
          <div style={{ textAlign: "right" }}>Current</div>
          <div style={{ textAlign: "right" }}>Previous</div>
          <div style={{ textAlign: "right" }}>Δ</div>
          <div style={{ textAlign: "right" }}>%Δ</div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r) => (
            <div
              key={r.label}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 110px 110px 90px 90px",
                gap: 10,
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(0,0,0,0.14)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 900 }}>{r.label}</div>
              <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {fmtInt(r.current)}
              </div>
              <div
                style={{
                  textAlign: "right",
                  color: "var(--text-muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtInt(r.previous)}
              </div>
              <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {r.delta}
              </div>
              <div
                style={{
                  textAlign: "right",
                  color: "var(--text-muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {r.changePct}
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: 14 }} />

        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
          Rates (Δ shown as percentage points)
        </div>

        {/* Rates header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 110px 110px 90px",
            gap: 10,
            padding: "0 12px",
            marginBottom: 8,
            fontSize: 11,
            letterSpacing: 0.3,
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          <div>Rate</div>
          <div style={{ textAlign: "right" }}>Current</div>
          <div style={{ textAlign: "right" }}>Previous</div>
          <div style={{ textAlign: "right" }}>Δ (pp)</div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {rateRows.map((r) => (
            <div
              key={r.label}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 110px 110px 90px",
                gap: 10,
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(0,0,0,0.10)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 900 }}>{r.label}</div>
              <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {fmtPct(r.current)}
              </div>
              <div
                style={{
                  textAlign: "right",
                  color: "var(--text-muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtPct(r.previous)}
              </div>
              <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {r.deltaPp}
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: 6 }} />

        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          * Previous period is the same number of days immediately before the current range.
        </div>
      </Card>

      {/* Right: at-a-glance compare dials */}
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
          <MiniDial
            label="Lead → Sale %"
            valuePct={curLeadToSale}
            deltaPp={ppDeltaText(curLeadToSale, prevLeadToSale)}
          />
          <MiniDial
            label="Qualified → Sale %"
            valuePct={curQualifiedToSale}
            deltaPp={ppDeltaText(curQualifiedToSale, prevQualifiedToSale)}
          />
        </div>
      </Card>
    </div>
  );
}