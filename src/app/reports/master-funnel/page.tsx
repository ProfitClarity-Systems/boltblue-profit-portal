"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { getMasterFunnelStatic } from "./query";
import { MasterFunnelView } from "./views/MasterFunnelView";

type RangeKey = "7d" | "30d" | "90d";

export default function MasterFunnelPage() {
  const [range, setRange] = useState<RangeKey>("7d");

  const clientName = "";

  const data = useMemo(() => getMasterFunnelStatic(range), [range]);

  return (
    <>
      <AppHeader
        clientName={clientName}
        subtitle="Traffic → Enquiries → Qualified → Sales → Revenue."
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
                Static preview — wiring Supabase next.
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
        </Card>

        <div style={{ height: 14 }} />

        <MasterFunnelView data={data} />

        <div style={{ height: 40 }} />
      </Container>
    </>
  );
}