"use client";

import { Card } from "@/components/ui/Card";
import {
  MasterFunnelData,
  getStageConversions,
  getQualifiedAppointmentPct,
} from "../query";

function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n);
}

function formatPct(n: number) {
  return `${n.toFixed(1)}%`;
}

function Stage({
  label,
  value,
  highlight,
  subLine,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  subLine?: string;
}) {
  return (
    <div
      style={{
        borderRadius: "var(--radius-lg)",
        border: highlight
          ? "1px solid rgba(164,255,0,0.6)"
          : "1px solid var(--border-strong)",
        background: "rgba(255,255,255,0.02)",
        padding: 20,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
        {label}
      </div>

      <div style={{ fontSize: 32, fontWeight: 950 }}>
        {value}
      </div>

      {subLine && (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          {subLine}
        </div>
      )}
    </div>
  );
}

function Arrow({ pct }: { pct: number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        padding: "10px 0",
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          border: "1px solid var(--border-strong)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ↓
      </div>

      <div
        style={{
          borderRadius: 999,
          border: "1px solid var(--border-strong)",
          padding: "6px 12px",
          fontSize: 13,
          fontWeight: 900,
        }}
      >
        {formatPct(pct)}
      </div>
    </div>
  );
}

export function MasterFunnelView({ data }: { data: MasterFunnelData }) {
  const conversions = getStageConversions(data);
  const qualifiedAppPct = getQualifiedAppointmentPct(data);

  return (
    <Card style={{ padding: 16 }}>
      <Stage label="Leads" value={formatNumber(data.leads)} />

      <Arrow pct={conversions.leadToQualified} />

      <Stage label="Qualified" value={formatNumber(data.qualified)} />

      <Arrow pct={conversions.qualifiedToAppointment} />

      <Stage
        label="Appointments"
        value={formatNumber(data.appointments)}
        subLine={`${formatNumber(
          data.qualifiedAppointments
        )} Qualified Appointments (${formatPct(qualifiedAppPct)})`}
      />

      <Arrow pct={conversions.appointmentToSale} />

      <Stage
        label="Sales"
        value={formatNumber(data.sales)}
        highlight
      />
    </Card>
  );
}