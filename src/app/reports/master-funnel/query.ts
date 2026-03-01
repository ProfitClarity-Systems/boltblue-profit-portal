import { supabase } from "@/lib/supabase";

export type MasterFunnelData = {
  leads: number;
  qualified: number;
  appointments: number;
  qualifiedAppointments: number;
  sales: number;
};

export type MasterFunnelRangeKey = "7d" | "30d" | "90d";

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
 * Funnel anchored on deal_created_at within range.
 *
 * NOTE: Pipedrive "Are They Qualified?" is coming through as an option id (e.g. 45),
 * not the label ("Qualified"). We treat "45" as Qualified for now.
 */
export async function getMasterFunnel(
  range: MasterFunnelRangeKey
): Promise<MasterFunnelData> {
  const startIso = isoStartFromRange(range);

  const { data, error } = await supabase
    .from("pipedrive_deals")
    .select("status, qualified_status, sales_meeting_date, deal_created_at, pipeline")
    .eq("pipeline", "Leads")
    .gte("deal_created_at", startIso);

  if (error) throw new Error(error.message);

  const rows = data ?? [];

  const isQualified = (v: any) => {
    const s = String(v ?? "").trim();
    // Your confirmed "Qualified" option id is literally 45
    return s === "45" || s.toLowerCase() === "qualified";
  };

  const leads = rows.length;

  const qualified = rows.filter((r: any) => isQualified(r.qualified_status)).length;

  const appointments = rows.filter((r: any) => r.sales_meeting_date !== null).length;

  const qualifiedAppointments = rows.filter(
    (r: any) => isQualified(r.qualified_status) && r.sales_meeting_date !== null
  ).length;

  // Pipedrive status is usually lowercase in API ('won','lost','open') — handle both just in case
  const sales = rows.filter((r: any) => r.status === "won" || r.status === "Won").length;

  return { leads, qualified, appointments, qualifiedAppointments, sales };
}