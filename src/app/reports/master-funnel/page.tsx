"use client";

import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/ui/Container";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { ReportHeader } from "@/components/app/ReportHeader";
import { InfoTip } from "@/components/ui/InfoTip";
import { MasterFunnelView } from "./views/MasterFunnelView";
import { MasterFunnelCompareView } from "./views/MasterFunnelCompareView";
import {
  getMasterFunnel,
  getTrafficForRange,
  sourceKeySupportsTrafficStage,
  getMasterFunnelCompare,
  getTrafficCompare,
} from "./query";
import type {
  MasterFunnelData,
  MasterFunnelDateRange,
  SourceKey,
  CompareResult,
} from "./query";

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

            // Keep snapshot values in sync so switching back feels instant
            setFunnel(fC.current);
            setTraffic(tC.current);
          }
          return;
        }

        // Snapshot
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

  // Top-right actions: date controls only
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

        {/* Report view toggle */}
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

        {/* Source pills */}
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
          <MasterFunnelCompareView
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