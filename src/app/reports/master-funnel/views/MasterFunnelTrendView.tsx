"use client";

import { Card } from "@/components/ui/Card";
import type { TrendBucket } from "../query.trend";

function fmtInt(n: number) {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat().format(Math.round(n));
}

function maxOf(values: number[]) {
  return values.reduce((m, v) => (v > m ? v : m), 0);
}

function BarRow({
  title,
  data,
  getValue,
}: {
  title: string;
  data: TrendBucket[];
  getValue: (b: TrendBucket) => number;
}) {
  const values = data.map(getValue);
  const max = maxOf(values);

  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.10)",
        padding: 14,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
        {title}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(1, data.length)}, minmax(0, 1fr))`,
          gap: 8,
          alignItems: "end",
        }}
      >
        {data.map((b, idx) => {
          const v = getValue(b);
          const h = max > 0 ? Math.round((v / max) * 68) : 0;

          return (
            <div
              key={`${b.key}-${idx}`}
              title={`${b.label}\n${title}: ${fmtInt(v)}`}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                gap: 6,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  height: 72,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                  display: "flex",
                  alignItems: "flex-end",
                  padding: 6,
                }}
              >
                <div
                  style={{
                    height: h,
                    width: "100%",
                    borderRadius: 10,
                    background:
                      "linear-gradient(180deg, rgba(164,255,0,0.70), rgba(164,255,0,0.18))",
                    boxShadow: v > 0 ? "0 0 18px rgba(164,255,0,0.10)" : "none",
                  }}
                />
              </div>

              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  textAlign: "center",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtInt(v)}
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  textAlign: "center",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {b.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MasterFunnelTrendView({
  buckets,
  showTrafficStage,
}: {
  buckets: TrendBucket[];
  showTrafficStage: boolean;
}) {
  if (!buckets || buckets.length === 0) {
    return (
      <Card
        style={{
          padding: 16,
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(900px 360px at 50% -120px, rgba(164,255,0,0.06), transparent 60%), rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 950 }}>Trend</div>
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
          No data for this range.
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Card
        style={{
          padding: 16,
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(900px 360px at 50% -120px, rgba(164,255,0,0.06), transparent 60%), rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 950 }}>Trend</div>
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
          Full funnel over time (bucketed automatically based on range length)
        </div>

        <div style={{ height: 14 }} />

        <div style={{ display: "grid", gap: 12 }}>
          {showTrafficStage ? (
            <BarRow title="Website Traffic" data={buckets} getValue={(b) => b.traffic} />
          ) : null}

          <BarRow title="Leads" data={buckets} getValue={(b) => b.leads} />
          <BarRow title="Qualified" data={buckets} getValue={(b) => b.qualified} />
          <BarRow
            title="Qualified Appointments"
            data={buckets}
            getValue={(b) => b.qualifiedAppointments}
          />
          <BarRow title="Sales" data={buckets} getValue={(b) => b.sales} />
        </div>
      </Card>
    </div>
  );
}