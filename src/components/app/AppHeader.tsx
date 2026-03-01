"use client";

import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Container } from "@/components/ui/Container";
import { SecondaryButton } from "@/components/ui/SecondaryButton";

type AppHeaderProps = {
  clientName?: string;
  subtitle?: string;
};

export function AppHeader({
  clientName = "",
  subtitle = "Select a report to view performance metrics.",
}: AppHeaderProps) {
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

          <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.08 }}>
            {clientName}
          </div>

          <div style={{ height: 10 }} />

          <div style={{ color: "var(--text-muted)", maxWidth: 720 }}>
            {subtitle}
          </div>
        </div>

        <SecondaryButton onClick={onSignOut}>Sign out</SecondaryButton>
      </div>
    </Container>
  );
}