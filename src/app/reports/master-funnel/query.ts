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
  return d.toISOString(); // midnight local parsed -> ISO in UTC; acceptable for now
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
 * Real data load from Supabase (pipedrive_deals)
 * Funnel anchored on deal_created_at.
 *
 * Accepts either:
 * - "7d" | "30d" | "90d"
 * - { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }
 *
 * NOTE: Pipedrive "Are They Qualified?" is currently stored as option id.
 * You confirmed "Qualified" == 45.
 */
export async function getMasterFunnel(input: MasterFunnelInput): Promise<MasterFunnelData> {
  const isRangeKey = typeof input === "string";

  const startIso = isRangeKey
    ? isoStartFromRange(input)
    : startIsoFromYMD(input.startDate) ?? isoStartFromRange("7d");

  // If explicit date range provided and endDate set, do end-exclusive filter
  const endExclusiveIso = !isRangeKey
    ? endExclusiveIsoFromYMD(input.endDate)
    : null;

  const q = supabase
    .from("pipedrive_deals")
    .select("status, qualified_status, sales_meeting_date, deal_created_at, pipeline")
    .eq("pipeline", "Leads")
    .gte("deal_created_at", startIso);

  const { data, error } = endExclusiveIso
    ? await q.lt("deal_created_at", endExclusiveIso)
    : await q;

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

/**
 * Optional helper for your UI: builds the label shown in the range pill.
 * (Useful once we wire DateRangePicker + presets in the page.)
 */
export function formatRangeLabel(range: MasterFunnelDateRange) {
  const from = safeDateFromYMD(range.startDate);
  const to = safeDateFromYMD(range.endDate);
  if (!from || !to) return "";
  return `${toYYYYMMDD(from)} → ${toYYYYMMDD(to)}`;
}