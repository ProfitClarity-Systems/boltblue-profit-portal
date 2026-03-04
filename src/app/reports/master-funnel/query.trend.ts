import { supabase } from "@/lib/supabase";
import type { MasterFunnelDateRange, SourceKey } from "./query";
import { sourceKeySupportsTrafficStage } from "./query";

export type TrendBucket = {
  key: string; // e.g. "2025-07-01" or "2025-07" or week start date
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (inclusive)
  traffic: number;
  leads: number;
  qualified: number;
  qualifiedAppointments: number;
  sales: number;
};

type Granularity = "day" | "week" | "month";

function safeDateFromYMD(ymd: string) {
  if (!ymd) return null;
  const d = new Date(`${ymd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function startOfWeekMon(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetweenInclusive(a: Date, b: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const aa = new Date(a);
  aa.setHours(0, 0, 0, 0);
  const bb = new Date(b);
  bb.setHours(0, 0, 0, 0);
  return Math.round((bb.getTime() - aa.getTime()) / msPerDay) + 1;
}

function pickGranularity(range: MasterFunnelDateRange): Granularity {
  const start = safeDateFromYMD(range.startDate);
  const end = safeDateFromYMD(range.endDate);
  if (!start || !end) return "week";

  const len = daysBetweenInclusive(start, end);
  if (len <= 14) return "day";
  if (len <= 90) return "week";
  return "month";
}

/**
 * Pipedrive leadsource mapping (widened to string[] to avoid TS literal-union issues)
 */
const LEADSOURCE_VALUES = {
  website: ["Website"] as string[],
  google: ["Google Ads"] as string[],
  meta: ["Meta Ads", "Facebook"] as string[],
  phone: ["Phone", "Phone Lead"] as string[],
  networking: ["Networking"] as string[],
  pastClient: ["Past Client"] as string[],
  referral: ["Referral"] as string[],
};

const ALL_WEB_LEADSOURCES: string[] = [
  ...LEADSOURCE_VALUES.website,
  ...LEADSOURCE_VALUES.google,
  ...LEADSOURCE_VALUES.meta,
  ...LEADSOURCE_VALUES.phone,
];

const KNOWN_LEADSOURCES: string[] = Array.from(
  new Set<string>([
    ...LEADSOURCE_VALUES.website,
    ...LEADSOURCE_VALUES.google,
    ...LEADSOURCE_VALUES.meta,
    ...LEADSOURCE_VALUES.phone,
    ...LEADSOURCE_VALUES.networking,
    ...LEADSOURCE_VALUES.pastClient,
    ...LEADSOURCE_VALUES.referral,
  ])
);

function applyPipedriveFilter(rows: any[], sourceKey: SourceKey) {
  const ls = (r: any) => String(r?.leadsource ?? "").trim();

  if (sourceKey === "allLeads") return rows;

  if (sourceKey === "google") return rows.filter((r) => LEADSOURCE_VALUES.google.includes(ls(r)));
  if (sourceKey === "meta") return rows.filter((r) => LEADSOURCE_VALUES.meta.includes(ls(r)));
  if (sourceKey === "website") return rows.filter((r) => LEADSOURCE_VALUES.website.includes(ls(r)));
  if (sourceKey === "referral") return rows.filter((r) => LEADSOURCE_VALUES.referral.includes(ls(r)));
  if (sourceKey === "phone") return rows.filter((r) => LEADSOURCE_VALUES.phone.includes(ls(r)));
  if (sourceKey === "networking") return rows.filter((r) => LEADSOURCE_VALUES.networking.includes(ls(r)));
  if (sourceKey === "pastClient") return rows.filter((r) => LEADSOURCE_VALUES.pastClient.includes(ls(r)));

  if (sourceKey === "allWeb") return rows.filter((r) => ALL_WEB_LEADSOURCES.includes(ls(r)));

  if (sourceKey === "other") {
    return rows.filter((r) => {
      const v = ls(r);
      if (!v) return true;
      return !KNOWN_LEADSOURCES.includes(v);
    });
  }

  return rows;
}

/**
 * GA matching (mirrors query.ts)
 */
function norm(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function matchGaRow(sourceKey: SourceKey, row: { source: string; medium: string }) {
  if (sourceKey === "allWeb") return true;

  const s = norm(row.source);
  const m = norm(row.medium);

  if (sourceKey === "google") {
    return s === "google" && (m === "organic" || m === "cpc" || m === "ppc");
  }

  if (sourceKey === "meta") {
    if (s === "facebook" || s === "fb" || s === "ig") return true;
    if (
      s.includes("facebook.com") ||
      s.includes("m.facebook.com") ||
      s.includes("l.facebook.com") ||
      s.includes("business.facebook.com")
    )
      return true;
    return false;
  }

  if (sourceKey === "website") {
    // direct + web referrals
    if (s === "(direct)" && (m === "(none)" || m === "none")) return true;
    if (m === "referral" || m === "referral_profile") return true;
    return false;
  }

  // CRM-only categories (or other/unmapped): no GA match
  return false;
}

function isQualifiedValue(v: any) {
  const s = String(v ?? "").trim();
  return s === "45" || s.toLowerCase() === "qualified";
}

function bucketKeyLabel(g: Granularity, d: Date) {
  if (g === "day") {
    const ymd = toYYYYMMDD(d);
    return { key: ymd, label: ymd };
  }
  if (g === "month") {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return { key: `${y}-${m}`, label: `${y}-${m}` };
  }
  // week: key = week start date (Mon)
  const start = startOfWeekMon(d);
  const key = toYYYYMMDD(start);
  const label = `${key} wk`;
  return { key, label };
}

function buildBuckets(range: MasterFunnelDateRange): TrendBucket[] {
  const start = safeDateFromYMD(range.startDate);
  const end = safeDateFromYMD(range.endDate);
  if (!start || !end) return [];

  const g = pickGranularity(range);
  const buckets: TrendBucket[] = [];

  if (g === "day") {
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const { key, label } = bucketKeyLabel("day", d);
      const ymd = toYYYYMMDD(d);
      buckets.push({
        key,
        label,
        startDate: ymd,
        endDate: ymd,
        traffic: 0,
        leads: 0,
        qualified: 0,
        qualifiedAppointments: 0,
        sales: 0,
      });
    }
    return buckets;
  }

  if (g === "week") {
    let cursor = startOfWeekMon(start);
    while (cursor <= end) {
      const weekStart = new Date(cursor);
      const weekEnd = addDays(weekStart, 6);

      const clampedStart = weekStart < start ? start : weekStart;
      const clampedEnd = weekEnd > end ? end : weekEnd;

      const { key, label } = bucketKeyLabel("week", clampedStart);

      buckets.push({
        key,
        label,
        startDate: toYYYYMMDD(clampedStart),
        endDate: toYYYYMMDD(clampedEnd),
        traffic: 0,
        leads: 0,
        qualified: 0,
        qualifiedAppointments: 0,
        sales: 0,
      });

      cursor = addDays(cursor, 7);
    }
    return buckets;
  }

  // month
  let cursor = startOfMonth(start);
  while (cursor <= end) {
    const monthStart = new Date(cursor);
    const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const monthEnd = addDays(nextMonth, -1);

    const clampedStart = monthStart < start ? start : monthStart;
    const clampedEnd = monthEnd > end ? end : monthEnd;

    const { key, label } = bucketKeyLabel("month", clampedStart);

    buckets.push({
      key,
      label,
      startDate: toYYYYMMDD(clampedStart),
      endDate: toYYYYMMDD(clampedEnd),
      traffic: 0,
      leads: 0,
      qualified: 0,
      qualifiedAppointments: 0,
      sales: 0,
    });

    cursor = nextMonth;
  }

  return buckets;
}

function withinBucket(dealCreatedIso: string, bucket: TrendBucket) {
  const ymd = new Date(dealCreatedIso).toISOString().slice(0, 10);
  return ymd >= bucket.startDate && ymd <= bucket.endDate;
}

export async function getMasterFunnelTrend(
  range: MasterFunnelDateRange,
  sourceKey: SourceKey
): Promise<TrendBucket[]> {
  const start = safeDateFromYMD(range.startDate);
  const end = safeDateFromYMD(range.endDate);
  if (!start || !end) return [];

  const buckets = buildBuckets(range);
  if (buckets.length === 0) return [];

  // Deals fetch once; bucket in-memory
  const startIso = new Date(`${range.startDate}T00:00:00`).toISOString();
  const endExclusiveIso = addDays(new Date(`${range.endDate}T00:00:00`), 1).toISOString();

  const { data: deals, error: dealsErr } = await supabase
    .from("pipedrive_deals")
    .select("status, qualified_status, sales_meeting_date, deal_created_at, pipeline, leadsource")
    .eq("pipeline", "Leads")
    .gte("deal_created_at", startIso)
    .lt("deal_created_at", endExclusiveIso);

  if (dealsErr) throw new Error(dealsErr.message);

  const filteredDeals = applyPipedriveFilter(deals ?? [], sourceKey);

  for (const b of buckets) {
    const inBucket = filteredDeals.filter((r: any) => withinBucket(r.deal_created_at, b));
    b.leads = inBucket.length;
    b.qualified = inBucket.filter((r: any) => isQualifiedValue(r.qualified_status)).length;
    b.qualifiedAppointments = inBucket.filter(
      (r: any) => isQualifiedValue(r.qualified_status) && r.sales_meeting_date !== null
    ).length;
    b.sales = inBucket.filter((r: any) => r.status === "won" || r.status === "Won").length;
  }

  // Traffic (optional)
  if (sourceKeySupportsTrafficStage(sourceKey)) {
    const { data: trafficRows, error: tErr } = await supabase
      .from("ga4_daily_traffic")
      .select("date, source, medium, sessions")
      .gte("date", range.startDate)
      .lte("date", range.endDate);

    if (tErr) throw new Error(tErr.message);

    const rows = (trafficRows ?? []) as Array<{
      date: string;
      source: string;
      medium: string;
      sessions: number;
    }>;

    for (const b of buckets) {
      const inBucket = rows.filter((r) => r.date >= b.startDate && r.date <= b.endDate);
      const filtered = sourceKey === "allWeb" ? inBucket : inBucket.filter((r) => matchGaRow(sourceKey, r));
      b.traffic = filtered.reduce((sum, r) => sum + (r.sessions ?? 0), 0);
    }
  }

  return buckets;
}