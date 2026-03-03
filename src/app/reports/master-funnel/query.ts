import { supabase } from "@/lib/supabase";

export type MasterFunnelData = {
  leads: number;
  qualified: number;
  appointments: number;
  qualifiedAppointments: number;
  sales: number;
};

export type MasterFunnelRangeKey = "7d" | "30d" | "90d";

export type MasterFunnelDateRange = {
  startDate: string; // YYYY-MM-DD ("" allowed)
  endDate: string; // YYYY-MM-DD ("" allowed)
};

export type MasterFunnelInput = MasterFunnelRangeKey | MasterFunnelDateRange;

/**
 * SourceKey = the pill filters for the Master Funnel report.
 *
 * Model:
 * - allLeads: all CRM leads (NO traffic stage)
 * - allWeb:   all website-backed leads (YES traffic stage)
 * - website:  general website bucket (YES traffic stage) = GA direct + GA referral mediums
 * - google/meta: yes traffic stage
 * - referral/networking/pastClient/other/phone: no traffic stage
 */
export type SourceKey =
  | "allLeads"
  | "allWeb"
  | "google"
  | "meta"
  | "website"
  | "referral" // person/manual
  | "phone"
  | "networking"
  | "pastClient"
  | "other"; // unmapped / unknown leadsource

export type CompareResult<T> = {
  current: T;
  previous: T;
  currentRange: MasterFunnelDateRange;
  previousRange: MasterFunnelDateRange;
};

/**
 * Controls whether Stage 0 (Website Traffic) should appear.
 */
export function sourceKeySupportsTrafficStage(sourceKey: SourceKey) {
  return (
    sourceKey === "allWeb" ||
    sourceKey === "google" ||
    sourceKey === "meta" ||
    sourceKey === "website"
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYYYYMMDD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function safeDateFromYMD(ymd: string) {
  if (!ymd) return null;
  const d = new Date(`${ymd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startIsoFromYMD(ymd: string) {
  const d = safeDateFromYMD(ymd);
  if (!d) return null;
  return d.toISOString();
}

function endExclusiveIsoFromYMD(ymd: string) {
  const d = safeDateFromYMD(ymd);
  if (!d) return null;
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  return next.toISOString();
}

function isoStartFromRange(range: MasterFunnelRangeKey) {
  const now = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1)); // inclusive length
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

function pct(n: number, d: number) {
  if (!d) return 0;
  return (n / d) * 100;
}

export function getStageConversions(data: MasterFunnelData) {
  return {
    leadToQualified: pct(data.qualified, data.leads),
    qualifiedToAppointment: pct(data.appointments, data.qualified),
    appointmentToSale: pct(data.sales, data.appointments),
  };
}

export function getQualifiedAppointmentPct(data: MasterFunnelData) {
  return pct(data.qualifiedAppointments, data.appointments);
}

/**
 * Compute the "previous period" range:
 * - same number of days as current
 * - immediately preceding (ends the day before current.startDate)
 *
 * Example:
 * Current: 2026-03-01 → 2026-03-07 (7 days)
 * Previous: 2026-02-22 → 2026-02-28 (7 days)
 */
export function getPreviousPeriodRange(
  current: MasterFunnelDateRange
): MasterFunnelDateRange {
  const start = safeDateFromYMD(current.startDate);
  const end = safeDateFromYMD(current.endDate);

  // Safe defaults (shouldn't happen in your UI, but keeps the function robust)
  if (!start || !end) {
    const now = new Date();
    const curr: MasterFunnelDateRange = {
      startDate: toYYYYMMDD(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)),
      endDate: toYYYYMMDD(now),
    };
    return getPreviousPeriodRange(curr);
  }

  // inclusive day count
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayCount = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (dayCount - 1));

  return {
    startDate: toYYYYMMDD(prevStart),
    endDate: toYYYYMMDD(prevEnd),
  };
}

/**
 * Pipedrive leadsource mapping
 */
const LEADSOURCE_VALUES = {
  website: ["Website"],
  google: ["Google Ads"],
  meta: ["Meta Ads", "Facebook"],
  phone: ["Phone", "Phone Lead"],
  networking: ["Networking"],
  pastClient: ["Past Client"],
  referral: ["Referral"],
} as const;

// WIDEN to string[] so .includes(ls: string) is valid
const ALL_WEB_LEADSOURCES: string[] = [
  ...LEADSOURCE_VALUES.website,
  ...LEADSOURCE_VALUES.google,
  ...LEADSOURCE_VALUES.meta,
  ...LEADSOURCE_VALUES.phone,
];

// WIDEN to string[] so .includes(ls: string) is valid
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

/**
 * GA matching rules (lowercased)
 *
 * - website traffic = (direct)/(none) + medium=referral(+referral_profile)
 * - google traffic = source=google and medium in organic/cpc/ppc
 * - meta traffic = fb/ig sources (and common facebook domains)
 * - allWeb traffic = all GA sessions (full site sessions)
 */
type GaRule = { sources?: string[]; mediums?: string[]; sourceIncludes?: string[] };

const GA_SOURCE_RULES: Record<Exclude<SourceKey, "allLeads" | "other">, GaRule> = {
  allWeb: {},

  google: {
    sources: ["google"],
    mediums: ["organic", "cpc", "ppc"],
  },

  meta: {
    sources: ["facebook", "fb", "ig"],
    sourceIncludes: [
      "facebook.com",
      "m.facebook.com",
      "l.facebook.com",
      "business.facebook.com",
    ],
  },

  website: {
    sources: ["(direct)"],
    mediums: ["(none)", "none", "referral", "referral_profile"],
  },

  // CRM-only concepts: never match GA
  referral: { sources: ["__no_match__"] },
  phone: { sources: ["__no_match__"] },
  networking: { sources: ["__no_match__"] },
  pastClient: { sources: ["__no_match__"] },
};

function normalizeLower(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function applyPipedriveSourceFilter(q: any, sourceKey: SourceKey) {
  if (sourceKey === "allLeads") return q;

  if (sourceKey === "google") return q.in("leadsource", LEADSOURCE_VALUES.google);
  if (sourceKey === "meta") return q.in("leadsource", LEADSOURCE_VALUES.meta);
  if (sourceKey === "website") return q.in("leadsource", LEADSOURCE_VALUES.website);
  if (sourceKey === "referral") return q.in("leadsource", LEADSOURCE_VALUES.referral);
  if (sourceKey === "phone") return q.in("leadsource", LEADSOURCE_VALUES.phone);
  if (sourceKey === "networking") return q.in("leadsource", LEADSOURCE_VALUES.networking);
  if (sourceKey === "pastClient") return q.in("leadsource", LEADSOURCE_VALUES.pastClient);

  if (sourceKey === "allWeb") return q.in("leadsource", ALL_WEB_LEADSOURCES);

  if (sourceKey === "other") {
    // We'll filter client-side after fetch for safety/readability
    return q;
  }

  return q;
}

function matchGaRow(sourceKey: SourceKey, row: { source: string; medium: string }) {
  if (sourceKey === "allWeb") return true;

  const rules = GA_SOURCE_RULES[sourceKey as Exclude<SourceKey, "allLeads" | "other">];
  if (!rules) return false;

  const hasAnyRule =
    (rules.sources && rules.sources.length > 0) ||
    (rules.mediums && rules.mediums.length > 0) ||
    (rules.sourceIncludes && rules.sourceIncludes.length > 0);

  if (!hasAnyRule) return true;

  const s = normalizeLower(row.source);
  const m = normalizeLower(row.medium);

  if (rules.sources && rules.sources.includes(s)) return true;
  if (rules.sourceIncludes && rules.sourceIncludes.some((frag) => s.includes(frag))) return true;
  if (rules.mediums && rules.mediums.includes(m)) return true;

  return false;
}

function isQualifiedValue(v: any) {
  const s = String(v ?? "").trim();
  return s === "45" || s.toLowerCase() === "qualified";
}

/**
 * Real data load from Supabase (pipedrive_deals)
 * Funnel anchored on deal_created_at.
 */
export async function getMasterFunnel(
  input: MasterFunnelInput,
  sourceKey: SourceKey = "allLeads"
): Promise<MasterFunnelData> {
  const isRangeKey = typeof input === "string";

  const startIso = isRangeKey
    ? isoStartFromRange(input)
    : startIsoFromYMD((input as MasterFunnelDateRange).startDate) ?? isoStartFromRange("7d");

  const endExclusiveIso = !isRangeKey
    ? endExclusiveIsoFromYMD((input as MasterFunnelDateRange).endDate)
    : null;

  let q = supabase
    .from("pipedrive_deals")
    .select("status, qualified_status, sales_meeting_date, deal_created_at, pipeline, leadsource")
    .eq("pipeline", "Leads")
    .gte("deal_created_at", startIso);

  q = applyPipedriveSourceFilter(q, sourceKey);

  const { data, error } = endExclusiveIso ? await q.lt("deal_created_at", endExclusiveIso) : await q;

  if (error) throw new Error(error.message);

  let rows = data ?? [];

  if (sourceKey === "other") {
    rows = rows.filter((r: any) => {
      const ls = String(r?.leadsource ?? "").trim();
      if (!ls) return true; // null/empty
      return !KNOWN_LEADSOURCES.includes(ls);
    });
  }

  const leads = rows.length;
  const qualified = rows.filter((r: any) => isQualifiedValue(r.qualified_status)).length;
  const appointments = rows.filter((r: any) => r.sales_meeting_date !== null).length;

  const qualifiedAppointments = rows.filter(
    (r: any) => isQualifiedValue(r.qualified_status) && r.sales_meeting_date !== null
  ).length;

  const sales = rows.filter((r: any) => r.status === "won" || r.status === "Won").length;

  return { leads, qualified, appointments, qualifiedAppointments, sales };
}

export async function getTrafficForRange(
  input: MasterFunnelInput,
  sourceKey: SourceKey = "allLeads"
): Promise<number> {
  if (!sourceKeySupportsTrafficStage(sourceKey)) return 0;

  const isRangeKey = typeof input === "string";

  const startIso = isRangeKey
    ? isoStartFromRange(input)
    : startIsoFromYMD((input as MasterFunnelDateRange).startDate) ?? isoStartFromRange("7d");

  const endExclusiveIso = !isRangeKey
    ? endExclusiveIsoFromYMD((input as MasterFunnelDateRange).endDate)
    : null;

  const startDate = new Date(startIso).toISOString().slice(0, 10);
  const endExclusiveDate = endExclusiveIso ? new Date(endExclusiveIso).toISOString().slice(0, 10) : null;

  const q = supabase
    .from("ga4_daily_traffic")
    .select("source, medium, sessions")
    .gte("date", startDate);

  const { data, error } = endExclusiveDate ? await q.lt("date", endExclusiveDate) : await q;

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{ source: string; medium: string; sessions: number }>;

  const filtered = rows.filter((r) => matchGaRow(sourceKey, r));

  return filtered.reduce((sum, r) => sum + (r.sessions ?? 0), 0);
}

/**
 * Compare: funnel (current vs previous period)
 */
export async function getMasterFunnelCompare(
  currentRange: MasterFunnelDateRange,
  sourceKey: SourceKey = "allLeads"
): Promise<CompareResult<MasterFunnelData>> {
  const previousRange = getPreviousPeriodRange(currentRange);

  const [current, previous] = await Promise.all([
    getMasterFunnel(currentRange, sourceKey),
    getMasterFunnel(previousRange, sourceKey),
  ]);

  return { current, previous, currentRange, previousRange };
}

/**
 * Compare: traffic (current vs previous period)
 * - returns 0s when the selected source doesn't support traffic stage
 */
export async function getTrafficCompare(
  currentRange: MasterFunnelDateRange,
  sourceKey: SourceKey = "allLeads"
): Promise<CompareResult<number>> {
  const previousRange = getPreviousPeriodRange(currentRange);

  const [current, previous] = await Promise.all([
    getTrafficForRange(currentRange, sourceKey),
    getTrafficForRange(previousRange, sourceKey),
  ]);

  return { current, previous, currentRange, previousRange };
}

export function formatRangeLabel(range: MasterFunnelDateRange) {
  const from = safeDateFromYMD(range.startDate);
  const to = safeDateFromYMD(range.endDate);
  if (!from || !to) return "";
  return `${toYYYYMMDD(from)} → ${toYYYYMMDD(to)}`;
}