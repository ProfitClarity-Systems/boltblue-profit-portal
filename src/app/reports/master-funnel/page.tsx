"use client";

import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/ui/Container";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { ReportHeader } from "@/components/app/ReportHeader";
import { MasterFunnelView } from "./views/MasterFunnelView";
import { getMasterFunnel } from "./query";
import type { MasterFunnelData, MasterFunnelDateRange } from "./query";

type PresetKey =
  | "last7"
  | "mtd"
  | "lastMonth"
  | "monthBeforeLast"
  | "ytd"
  | "fytd";

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

export default function MasterFunnelPage() {
  const [preset, setPreset] = useState<PresetKey>("last7");
  const [customRange, setCustomRange] = useState<MasterFunnelDateRange>({
    startDate: "",
    endDate: "",
  });

  const activeRange = useMemo<MasterFunnelDateRange>(() => {
    if (customRange.startDate && customRange.endDate) return customRange;
    return presetToRange(preset);
  }, [preset, customRange]);

  const [data, setData] = useState<MasterFunnelData>({
    leads: 0,
    qualified: 0,
    appointments: 0,
    qualifiedAppointments: 0,
    sales: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await getMasterFunnel(activeRange);
        if (!cancelled) setData(res);
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
  }, [activeRange.startDate, activeRange.endDate]);

  function pickPreset(next: PresetKey) {
    setPreset(next);
    setCustomRange({ startDate: "", endDate: "" }); // clear custom when using preset
  }

  function onReset() {
    setPreset("last7");
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
              style={{
                borderColor: active ? "var(--lime)" : undefined,
              }}
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
        description="Leads → Qualified → Appointments → Sales"
        actions={actions}
        backHref="/reports"
        backLabel="Back"
      />

      <Container>
        <div style={{ height: 18 }} />

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

        <MasterFunnelView data={data} />

        <div style={{ height: 40 }} />
      </Container>
    </>
  );
}