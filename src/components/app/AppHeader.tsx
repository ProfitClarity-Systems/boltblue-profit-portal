"use client";

import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Container } from "@/components/ui/Container";
import { SecondaryButton } from "@/components/ui/SecondaryButton";

export function AppHeader(props: {
  clientName?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const { clientName = "", subtitle, actions } = props;

  async function onSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div style={{ paddingTop: 40 }}>
      <Container>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 10 }}>
              <Image
                src="/boltblue-logo.png"
                alt="BoltBlue"
                width={160}
                height={38}
                priority
              />
            </div>

            <div
              style={{
                color: "var(--lime)",
                fontWeight: 900,
                letterSpacing: 0.8,
                fontSize: 12,
                marginBottom: 10,
              }}
            >
              PROFIT PORTAL
            </div>

            {clientName ? (
              <>
                <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.08 }}>
                  {clientName}
                </div>
                <div style={{ height: 10 }} />
              </>
            ) : null}

            {subtitle ? (
              <div style={{ color: "var(--text-muted)", maxWidth: 860 }}>
                {subtitle}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
            <SecondaryButton onClick={onSignOut}>Sign out</SecondaryButton>
            {actions ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>{actions}</div> : null}
          </div>
        </div>
      </Container>
    </div>
  );
}