"use client";

import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/ui/Container";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { ReportHeader } from "@/components/app/ReportHeader";
import { MasterFunnelView } from "./views/MasterFunnelView";
import {
  getMasterFunnel,
  getTrafficForRange,
  sourceKeySupportsTrafficStage,
  getMasterFunnelCompare,
  getTrafficCompare,
  formatRangeLabel,
} from "./query";
import type {
  MasterFunnelData,
  MasterFunnelDateRange,
  SourceKey,
  CompareResult,
} from "./query";
import { InfoTip } from "@/components/ui/InfoTip";
import { Card } from "@/components/ui/Card";

type PresetKey = "last7" | "mtd" | "lastMonth" | "monthBeforeLast" | "ytd" | "fytd";
type ViewMode = "snapshot" | "compare";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toYYYYMMDD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}
function startOfFY(d: Date) {
  // AU FY: 1 July → 30 June
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-11
  const fyStartYear = m >= 6 ? y : y - 1;
  return new Date(fyStartYear, 6, 1);
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function lastDayOfPrevMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 0);
}

function presetToRange(preset: PresetKey, now = new Date()): MasterFunnelDateRange {
  const end = toYYYYMMDD(now);

  if (preset === "last7") {
    const start = toYYYYMMDD(addDays(now, -6)); // inclusive 7 days
    return { startDate: start, endDate: end };
  }

  if (preset === "mtd") {
    return { startDate: toYYYYMMDD(startOfMonth(now)), endDate: end };
  }

  if (preset === "ytd") {
    return { startDate: toYYYYMMDD(startOfYear(now)), endDate: end };
  }

  if (preset === "fytd") {
    return { startDate: toYYYYMMDD(startOfFY(now)), endDate: end };
  }

  if (preset === "lastMonth") {
    const last = lastDayOfPrevMonth(now);
    const start = new Date(last.getFullYear(), last.getMonth(), 1);
    return { startDate: toYYYYMMDD(start), endDate: toYYYYMMDD(last) };
  }

  // monthBeforeLast
  const last = lastDayOfPrevMonth(now);
  const lastStart = new Date(last.getFullYear(), last.getMonth(), 1);
  const prevEnd = addDays(lastStart, -1);
  const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
  return { startDate: toYYYYMMDD(prevStart), endDate: toYYYYMMDD(prevEnd) };
}

function fmtInt(n: number) {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat().format(Math.round(n));
}
function fmtPct(n: number) {
  if (!Number.isFinite(n)) return "0.0%";
  return `${n.toFixed(1)}%`;
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
function pct(n: number, d: number) {
  if (!d) return 0;
  return (n / d) * 100;
}
function ppDeltaText(currentPct: number, prevPct: number) {
  const d = currentPct - prevPct;
  const sign = d > 0 ? "+" : "";
  return `${sign}${d.toFixed(1)}pp`;
}

const SOURCE_INFO: Record<SourceKey, string> = {
  allLeads:
    "All Leads (CRM)\n• Deals: All Pipedrive deals in the Leads pipeline\n• Traffic: Not shown\nUse this for the pure sales funnel regardless of origin.",
  allWeb:
    "All Web Leads\n• Deals: Website + Google Ads + Meta Ads/Facebook + Phone/Phone Lead\n• Traffic: All GA sessions (whole site)\nUse this for traffic → lead conversion across the full “website-backed” universe.",
  google:
    "Google\n• Deals: leadsource = Google Ads\n• Traffic: GA sessions where source = google and medium is organic/cpc/ppc\nNote: traffic includes organic + paid, but deals are currently “Google Ads” only.",
  meta:
    "Facebook/IG (Meta)\n• Deals: leadsource = Meta Ads or Facebook\n• Traffic: GA sessions attributed to facebook/fb/ig (incl common Facebook domains)",
  website:
    "Website\n• Deals: leadsource = Website\n• Traffic: GA Direct + GA web referrals (medium referral/referral_profile)\nThis is the general “came from the website” bucket.",
  referral:
    "Referral (person)\n• Deals: leadsource = Referral (manually set)\n• Traffic: Not shown\nThis is person-to-person referrals (not GA referral traffic).",
  phone:
    "Phone\n• Deals: leadsource = Phone or Phone Lead\n• Traffic: Not shown\nThese are phone-origin leads recorded in CRM.",
  networking:
    "Networking\n• Deals: leadsource = Networking\n• Traffic: Not shown",
  pastClient:
    "Past Client\n• Deals: leadsource = Past Client\n• Traffic: Not shown",
  other:
    "Other (Unmapped)\n• Deals: leadsource is blank/null OR not in the known list\n• Traffic: Not shown\nUse this to spot data that needs mapping cleanup.",
};

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
    deltaPp.startsWith("+") ? "rgba(164,255,0,0.95)" : deltaPp.startsWith("-") ? "rgba(255,210,120,0.95)" : "var(--text-muted)";

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

function ComparePanel({
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

      {/* Right: at-a-glance dials for compare */}
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

export default function MasterFunnelPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("snapshot");

  const [preset, setPreset] = useState<PresetKey>("last7");
  const [customRange, setCustomRange] = useState<MasterFunnelDateRange>({
    startDate: "",
    endDate: "",
  });

  const [sourceKey, setSourceKey] = useState<SourceKey>("allLeads");

  const showTrafficStage = sourceKeySupportsTrafficStage(sourceKey);

  const activeRange = useMemo<MasterFunnelDateRange>(() => {
    if (customRange.startDate && customRange.endDate) return customRange;
    return presetToRange(preset);
  }, [preset, customRange]);

  const [funnel, setFunnel] = useState<MasterFunnelData>({
    leads: 0,
    qualified: 0,
    appointments: 0,
    qualifiedAppointments: 0,
    sales: 0,
  });

  const [traffic, setTraffic] = useState<number>(0);

  const [funnelCompare, setFunnelCompare] = useState<CompareResult<MasterFunnelData> | null>(null);
  const [trafficCompare, setTrafficCompare] = useState<CompareResult<number> | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        if (viewMode === "compare") {
          const [fC, tC] = await Promise.all([
            getMasterFunnelCompare(activeRange, sourceKey),
            getTrafficCompare(activeRange, sourceKey),
          ]);

          if (!cancelled) {
            setFunnelCompare(fC);
            setTrafficCompare(tC);
            setFunnel(fC.current);
            setTraffic(tC.current);
          }
          return;
        }

        const [funnelRes, trafficRes] = await Promise.all([
          getMasterFunnel(activeRange, sourceKey),
          showTrafficStage ? getTrafficForRange(activeRange, sourceKey) : Promise.resolve(0),
        ]);

        if (!cancelled) {
          setFunnel(funnelRes);
          setTraffic(trafficRes);
          setFunnelCompare(null);
          setTrafficCompare(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [activeRange.startDate, activeRange.endDate, sourceKey, showTrafficStage, viewMode]);

  function pickPreset(next: PresetKey) {
    setPreset(next);
    setCustomRange({ startDate: "", endDate: "" });
  }

  const presets: Array<{ key: PresetKey; label: string }> = [
    { key: "last7", label: "Last 7 Days" },
    { key: "mtd", label: "Month to Date" },
    { key: "lastMonth", label: "Last Month" },
    { key: "monthBeforeLast", label: "Month Before Last" },
    { key: "ytd", label: "Year to Date" },
    { key: "fytd", label: "FY to Date" },
  ];

  const sources: Array<{ key: SourceKey; label: string }> = [
    { key: "allLeads", label: "All Leads" },
    { key: "allWeb", label: "All Web Leads" },

    { key: "google", label: "Google" },
    { key: "meta", label: "Facebook/IG" },
    { key: "website", label: "Website" },

    { key: "referral", label: "Referral (person)" },
    { key: "phone", label: "Phone" },
    { key: "networking", label: "Networking" },
    { key: "pastClient", label: "Past Client" },

    { key: "other", label: "Other" },
  ];

  // Top-right actions: date controls only (clean)
  const actions = (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {presets.map((p) => {
          const active = !(customRange.startDate && customRange.endDate) && preset === p.key;

          return (
            <SecondaryButton
              key={p.key}
              type="button"
              onClick={() => pickPreset(p.key)}
              style={{ borderColor: active ? "var(--lime)" : undefined }}
            >
              {p.label}
            </SecondaryButton>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <DateRangePicker
          startDate={activeRange.startDate}
          endDate={activeRange.endDate}
          onChange={(next) => setCustomRange(next)}
        />
      </div>
    </>
  );

  return (
    <>
      <ReportHeader
        title="Master Funnel"
        description={
          showTrafficStage
            ? "Website Traffic → Leads → Qualified → Qualified Appointments → Sales"
            : "Leads → Qualified → Qualified Appointments → Sales"
        }
        actions={actions}
        backHref="/reports"
        backLabel="Back"
      />

      <Container>
        <div style={{ height: 14 }} />

        {/* Report view toggle (moved out of top action row) */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 2 }}>
            Report view
          </div>

          <SecondaryButton
            type="button"
            onClick={() => setViewMode("snapshot")}
            style={{ borderColor: viewMode === "snapshot" ? "var(--lime)" : undefined }}
          >
            Snapshot
          </SecondaryButton>

          <SecondaryButton
            type="button"
            onClick={() => setViewMode("compare")}
            style={{ borderColor: viewMode === "compare" ? "var(--lime)" : undefined }}
          >
            Compare
          </SecondaryButton>
        </div>

        <div style={{ height: 12 }} />

        {/* Source pills under title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 2 }}>
              Source
            </div>
            <InfoTip text={SOURCE_INFO[sourceKey]} ariaLabel="Source filter info" />
          </div>

          {sources.map((s) => {
            const active = sourceKey === s.key;
            return (
              <SecondaryButton
                key={s.key}
                type="button"
                onClick={() => setSourceKey(s.key)}
                style={{ borderColor: active ? "var(--lime)" : undefined }}
              >
                {s.label}
              </SecondaryButton>
            );
          })}
        </div>

        <div style={{ height: 14 }} />

        {error ? (
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 10 }}>
            Error: {error}
          </div>
        ) : null}

        {loading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 10 }}>
            Loading…
          </div>
        ) : null}

        {viewMode === "compare" && funnelCompare && trafficCompare ? (
          <ComparePanel
            funnelCompare={funnelCompare}
            trafficCompare={trafficCompare}
            showTrafficStage={showTrafficStage}
          />
        ) : (
          <MasterFunnelView data={{ ...funnel, traffic }} showTrafficStage={showTrafficStage} />
        )}

        <div style={{ height: 40 }} />
      </Container>
    </>
  );
}