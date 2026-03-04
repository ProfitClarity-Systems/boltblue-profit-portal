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
function sumOf(values: number[]) {
  return values.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
}
function avgOf(values: number[]) {
  if (!values.length) return 0;
  return sumOf(values) / values.length;
}

function pickAxisLabelIndexes(n: number) {
  if (n <= 8) return Array.from({ length: n }, (_, i) => i);

  const idxs = new Set<number>();
  idxs.add(0);
  idxs.add(n - 1);
  idxs.add(Math.floor((n - 1) * 0.25));
  idxs.add(Math.floor((n - 1) * 0.5));
  idxs.add(Math.floor((n - 1) * 0.75));
  return Array.from(idxs).sort((a, b) => a - b);
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
  const total = sumOf(values);
  const avg = avgOf(values);

  const axisIdxs = pickAxisLabelIndexes(data.length);

  // Make bars readable by default:
  // - small bucket counts: thicker bars
  // - large bucket counts: slimmer bars + horizontal scroll
  const barW = data.length <= 10 ? 44 : data.length <= 18 ? 34 : data.length <= 30 ? 26 : 20;
  const gap = data.length <= 10 ? 14 : data.length <= 18 ? 12 : 10;

  const chartMinWidth = data.length * (barW + gap) + 24; // padding buffer

  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.10)",
        padding: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 950 }}>{title}</div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Total <span style={{ color: "var(--text)", fontWeight: 900 }}>{fmtInt(total)}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Avg/bucket{" "}
            <span style={{ color: "var(--text)", fontWeight: 900 }}>{fmtInt(avg)}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Peak <span style={{ color: "var(--text)", fontWeight: 900 }}>{fmtInt(max)}</span>
          </div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      {/* Chart */}
      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(1000px 260px at 50% 0%, rgba(164,255,0,0.06), transparent 60%), rgba(255,255,255,0.02)",
          padding: 14,
          overflowX: "auto",
        }}
      >
        <div style={{ minWidth: chartMinWidth }}>
          {/* Bars area */}
          <div
            style={{
              position: "relative",
              height: 160,
              display: "flex",
              alignItems: "flex-end",
              gap,
              padding: "10px 6px 28px 6px", // bottom space for baseline
            }}
          >
            {/* Baseline */}
            <div
              style={{
                position: "absolute",
                left: 6,
                right: 6,
                bottom: 28,
                height: 1,
                background: "rgba(255,255,255,0.12)",
              }}
            />

            {data.map((b, idx) => {
              const v = getValue(b);
              const h = max > 0 ? Math.round((v / max) * 118) : 0;

              return (
                <div
                  key={`${b.key}-${idx}`}
                  title={`${b.label}\n${title}: ${fmtInt(v)}`}
                  style={{
                    width: barW,
                    flex: "0 0 auto",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 8,
                  }}
                >
                  {/* bar */}
                  <div
                    style={{
                      width: "100%",
                      height: 118,
                      display: "flex",
                      alignItems: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: Math.max(3, h),
                        borderRadius: 14,
                        background:
                          "linear-gradient(180deg, rgba(164,255,0,0.80), rgba(164,255,0,0.18))",
                        boxShadow: v > 0 ? "0 0 22px rgba(164,255,0,0.12)" : "none",
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                    />
                  </div>

                  {/* value */}
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 950,
                      fontVariantNumeric: "tabular-nums",
                      color: v > 0 ? "var(--text)" : "var(--text-muted)",
                      lineHeight: 1,
                    }}
                  >
                    {fmtInt(v)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Axis labels */}
          <div
            style={{
              display: "flex",
              gap,
              padding: "0 6px",
            }}
          >
            {data.map((b, idx) => (
              <div
                key={`axis-${b.key}-${idx}`}
                style={{
                  width: barW,
                  flex: "0 0 auto",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  textAlign: "center",
                  opacity: axisIdxs.includes(idx) ? 1 : 0,
                  whiteSpace: "nowrap",
                }}
                title={b.label}
              >
                {b.label}
              </div>
            ))}
          </div>
        </div>
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
  );
}