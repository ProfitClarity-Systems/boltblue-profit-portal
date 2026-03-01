"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { SecondaryButton } from "@/components/ui/SecondaryButton";

type ReportItem = {
  href: string;
  title: string;
  description: string;
};

export default function ReportsPage() {
  const [query, setQuery] = useState("");

  const clientName = "Boltblue Digital Marketing";

  const reports: ReportItem[] = useMemo(
    () => [
      {
        href: "/reports/master-funnel",
        title: "Master Funnel",
        description: "Traffic → Enquiries → Qualified → Sales → Revenue.",
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => {
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    });
  }, [query, reports]);

  async function onSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <Container>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          paddingTop: 40,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: "var(--lime)",
              fontWeight: 900,
              letterSpacing: 0.6,
              marginBottom: 10,
            }}
          >
            PROFIT PORTAL
          </div>

          <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.08 }}>
            {clientName}
          </div>

          <div style={{ height: 10 }} />

          <div style={{ color: "var(--text-muted)", maxWidth: 720 }}>
            Select a report to view performance metrics.
          </div>
        </div>

        <SecondaryButton onClick={onSignOut}>Sign out</SecondaryButton>
      </div>

      <div style={{ height: 22 }} />

      <Card style={{ padding: 16, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reports…"
              style={{ width: "100%" }}
            />
          </div>

          <SecondaryButton
            type="button"
            onClick={() => setQuery("")}
            disabled={!query.trim()}
            style={{ opacity: query.trim() ? 1 : 0.6 }}
          >
            Clear
          </SecondaryButton>
        </div>

        <div style={{ height: 10 }} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          <div>{filtered.length} report(s)</div>
        </div>
      </Card>

      <div style={{ display: "grid", gap: 14, paddingBottom: 60 }}>
        {filtered.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-strong)",
                background: "rgba(255,255,255,0.02)",
                padding: 18,
                transition: "transform 120ms ease, border-color 120ms ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 950,
                      letterSpacing: 0.2,
                      marginBottom: 6,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {r.title}
                  </div>

                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: 13,
                      lineHeight: 1.4,
                    }}
                  >
                    {r.description}
                  </div>
                </div>

                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: "1px solid var(--border-strong)",
                    background: "rgba(255,255,255,0.03)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-faint)",
                    fontWeight: 950,
                    marginLeft: 6,
                  }}
                >
                  →
                </div>
              </div>
            </div>
          </Link>
        ))}

        {filtered.length === 0 ? (
          <div
            style={{
              padding: 18,
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-strong)",
              background: "rgba(255,255,255,0.02)",
              color: "var(--text-muted)",
            }}
          >
            No reports match your search.
          </div>
        ) : null}
      </div>
    </Container>
  );
}