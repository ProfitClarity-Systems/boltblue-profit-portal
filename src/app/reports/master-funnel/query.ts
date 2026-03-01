export type MasterFunnelData = {
  leads: number;
  qualified: number;
  appointments: number;
  qualifiedAppointments: number;
  sales: number;
};

type RangeKey = "7d" | "30d" | "90d";

function pct(n: number, d: number) {
  if (!d) return 0;
  return (n / d) * 100;
}

export function getMasterFunnelStatic(range: RangeKey): MasterFunnelData {
  const base =
    range === "7d"
      ? { leads: 120, qualified: 62, appointments: 48, sales: 14 }
      : range === "30d"
      ? { leads: 510, qualified: 270, appointments: 205, sales: 58 }
      : { leads: 1420, qualified: 710, appointments: 540, sales: 152 };

  const qualifiedAppointments = Math.round(base.appointments * 0.67);

  return {
    ...base,
    qualifiedAppointments,
  };
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