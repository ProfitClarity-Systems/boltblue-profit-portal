"use client";

import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export function ReportHeader(props: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  const {
    title,
    description,
    actions,
    backHref = "/reports",
    backLabel = "Back",
  } = props;

  return (
    <div style={{ paddingTop: 28 }}>
      <Container>
        {/* Top row: Back + Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <Link href={backHref} style={{ textDecoration: "none" }}>
            <PrimaryButton type="button">{backLabel}</PrimaryButton>
          </Link>

          {actions ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              {actions}
            </div>
          ) : null}
        </div>

        <div style={{ height: 28 }} />

        {/* Logo */}
        <div style={{ marginBottom: 14 }}>
          <Image
            src="/boltblue-logo.png"
            alt="BoltBlue"
            width={160}
            height={38}
            priority
          />
        </div>

        {/* REPORT eyebrow */}
        <div
          style={{
            color: "var(--lime)",
            fontWeight: 900,
            letterSpacing: 1,
            fontSize: 12,
          }}
        >
          REPORT
        </div>

        <div style={{ height: 10 }} />

        {/* Title */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 950,
            lineHeight: 1.05,
            letterSpacing: -0.6,
          }}
        >
          {title}
        </div>

        {description ? (
          <>
            <div style={{ height: 12 }} />
            <div
              style={{
                color: "var(--text-muted)",
                maxWidth: 860,
                lineHeight: 1.6,
              }}
            >
              {description}
            </div>
          </>
        ) : null}

        <div style={{ height: 24 }} />

        {/* Divider */}
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))",
          }}
        />
      </Container>
    </div>
  );
}