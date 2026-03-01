"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { MasterFunnelView } from "./views/MasterFunnelView";
import { getMasterFunnel } from "./query";
import type { MasterFunnelData, MasterFunnelRangeKey } from "./query";

export default function MasterFunnelPage() {
  const [range, setRange] = useState<MasterFunnelRangeKey>("7d");

  const [data, setData] = useState<MasterFunnelData>({
    leads: 0,
    qualified: 0,
    appointments: 0,
    qualifiedAppointments: 0,
    sales: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = "";

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await getMasterFunnel(range);
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
  }, [range]);

  return (
    <>
      <AppHeader
        clientName={clientName}
        subtitle="Leads → Qualified → Appointments → Sales"
      />

      <Container>
        <div style={{ height: 18 }} />

        <Card style={{ padding: 14 }}>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 240 }}>
              <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 4 }}>
                Master Funnel
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Live from Pipedrive (synced into Supabase).
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <SecondaryButton
                  type="button"
                  onClick={() => setRange("7d")}
                  style={{
                    borderColor: range === "7d" ? "var(--lime)" : undefined,
                  }}
                >
                  Last 7 days
                </SecondaryButton>

                <SecondaryButton
                  type="button"
                  onClick={() => setRange("30d")}
                  style={{
                    borderColor: range === "30d" ? "var(--lime)" : undefined,
                  }}
                >
                  30 days
                </SecondaryButton>

                <SecondaryButton
                  type="button"
                  onClick={() => setRange("90d")}
                  style={{
                    borderColor: range === "90d" ? "var(--lime)" : undefined,
                  }}
                >
                  90 days
                </SecondaryButton>
              </div>

              <SecondaryButton type="button" onClick={() => setRange("7d")}>
                Reset
              </SecondaryButton>
            </div>
          </div>

          {error ? (
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
              Error: {error}
            </div>
          ) : null}

          {loading ? (
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
              Loading…
            </div>
          ) : null}
        </Card>

        <div style={{ height: 14 }} />

        <MasterFunnelView data={data} />

        <div style={{ height: 40 }} />
      </Container>
    </>
  );
}