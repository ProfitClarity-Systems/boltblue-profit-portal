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
 * Lead source filter (developer-defined, not user-created)
 * This is what the UI pills will use.
 */
export type SourceKey =
  | "all"
  | "google"
  | "meta"
  | "referral"
  | "direct"
  | "phone"
  | "networking"
  | "pastClient";

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
  return d.toISOString(); // acceptable for now
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
  start.setDate(now.getDate() - days);
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
 * Mapping layer
 * - Pipedrive leadsource values are human-entered (Website/Referral/Meta Ads/etc)
 * - GA sources are machine-ish (google, (direct), facebook, fb, ig, referral mediums, etc)
 *
 * We normalize by SourceKey.
 */
const PIPEDRIVE_LEADSOURCE_MAP: Record<Exclude<SourceKey, "all">, string[]> = {
  google: ["Google Ads"],
  meta: ["Meta Ads", "Facebook"],
  referral: ["Referral"],
  direct: ["Website"], // "Website" in Pipedrive acts as "came via site" (often direct/organic)
  phone: ["Phone", "Phone Lead"],
  networking: ["Networking"],
  pastClient: ["Past Client"],
};

// GA matching rules (lowercased)
const GA_SOURCE_RULES: Record<
  Exclude<SourceKey, "all">,
  { sources?: string[]; mediums?: string[]; sourceIncludes?: string[] }
> = {
  google: {
    sources: ["google"],
    // include all the variants you showed
    mediums: ["organic", "cpc", "ppc"],
  },
  meta: {
    // fb / ig / facebook / domains
    sources: ["facebook", "fb", "ig"],
    sourceIncludes: ["facebook.com", "m.facebook.com", "l.facebook.com", "business.facebook.com"],
    // mediums are messy in your data, so don’t over-restrict
  },
  referral: {
    mediums: ["referral", "referral_profile"],
  },
  direct: {
    sources: ["(direct)"],
    mediums: ["(none)", "none"],
  },
  phone: {
    // GA usually doesn't classify phone as a source; this is mostly a CRM-only category.
    // We'll return 0 traffic for this filter (unless you later add UTM tagging for call tracking).
    sources: ["__no_match__"],
  },
  networking: {
    sources: ["__no_match__"],
  },
  pastClient: {
    sources: ["__no_match__"],
  },
};

function normalizeLower(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function applyPipedriveSourceFilter<T extends { in: any; neq?: any }>(
  q: any,
  sourceKey: SourceKey
) {
  if (sourceKey === "all") return q;

  const allowed = PIPEDRIVE_LEADSOURCE_MAP[sourceKey];
  if (!allowed || allowed.length === 0) return q;

  return q.in("leadsource", allowed);
}

function matchGaRow(sourceKey: SourceKey, row: { source: string; medium: string }) {
  if (sourceKey === "all") return true;

  const rules = GA_SOURCE_RULES[sourceKey];
  if (!rules) return false;

  const s = normalizeLower(row.source);
  const m = normalizeLower(row.medium);

  if (rules.sources && rules.sources.includes(s)) return true;

  if (rules.sourceIncludes && rules.sourceIncludes.some((frag) => s.includes(frag))) return true;

  if (rules.mediums && rules.mediums.includes(m)) return true;

  return false;
}

/**
 * Real data load from Supabase (pipedrive_deals)
 * Funnel anchored on deal_created_at.
 *
 * NOTE: Pipedrive "Are They Qualified?" stored as option id (Qualified == 45).
 */
export async function getMasterFunnel(
  input: MasterFunnelInput,
  sourceKey: SourceKey = "all"
): Promise<MasterFunnelData> {
  const isRangeKey = typeof input === "string";

  const startIso = isRangeKey
    ? isoStartFromRange(input)
    : startIsoFromYMD(input.startDate) ?? isoStartFromRange("7d");

  const endExclusiveIso = !isRangeKey ? endExclusiveIsoFromYMD(input.endDate) : null;

  let q = supabase
    .from("pipedrive_deals")
    .select("status, qualified_status, sales_meeting_date, deal_created_at, pipeline, leadsource")
    .eq("pipeline", "Leads")
    .gte("deal_created_at", startIso);

  q = applyPipedriveSourceFilter(q, sourceKey);

  const { data, error } = endExclusiveIso ? await q.lt("deal_created_at", endExclusiveIso) : await q;

  if (error) throw new Error(error.message);

  const rows = data ?? [];

  const isQualified = (v: any) => {
    const s = String(v ?? "").trim();
    return s === "45" || s.toLowerCase() === "qualified";
  };

  const leads = rows.length;
  const qualified = rows.filter((r: any) => isQualified(r.qualified_status)).length;
  const appointments = rows.filter((r: any) => r.sales_meeting_date !== null).length;

  const qualifiedAppointments = rows.filter(
    (r: any) => isQualified(r.qualified_status) && r.sales_meeting_date !== null
  ).length;

  const sales = rows.filter((r: any) => r.status === "won" || r.status === "Won").length;

  return { leads, qualified, appointments, qualifiedAppointments, sales };
}

export async function getTrafficForRange(
  input: MasterFunnelInput,
  sourceKey: SourceKey = "all"
): Promise<number> {
  const isRangeKey = typeof input === "string";

  const startIso = isRangeKey
    ? isoStartFromRange(input)
    : startIsoFromYMD(input.startDate) ?? isoStartFromRange("7d");

  const endExclusiveIso = !isRangeKey ? endExclusiveIsoFromYMD(input.endDate) : null;

  const startDate = new Date(startIso).toISOString().slice(0, 10);
  const endExclusiveDate = endExclusiveIso ? new Date(endExclusiveIso).toISOString().slice(0, 10) : null;

  // Fetch only the columns we need for filtering
  const q = supabase
    .from("ga4_daily_traffic")
    .select("source, medium, sessions")
    .gte("date", startDate);

  const { data, error } = endExclusiveDate ? await q.lt("date", endExclusiveDate) : await q;

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{ source: string; medium: string; sessions: number }>;

  // Apply mapping in-memory (fast enough for daily rows + keeps logic readable)
  const filtered = sourceKey === "all" ? rows : rows.filter((r) => matchGaRow(sourceKey, r));

  return filtered.reduce((sum, r) => sum + (r.sessions ?? 0), 0);
}

/**
 * Optional helper for your UI: builds the label shown in the range pill.
 */
export function formatRangeLabel(range: MasterFunnelDateRange) {
  const from = safeDateFromYMD(range.startDate);
  const to = safeDateFromYMD(range.endDate);
  if (!from || !to) return "";
  return `${toYYYYMMDD(from)} → ${toYYYYMMDD(to)}`;
}