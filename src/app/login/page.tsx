"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("Signing in...");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus(`Error: ${error.message}`);
      setLoading(false);
      return;
    }

    router.push("/reports");
  }

  return (
    <Container>
      <div
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Card
          style={{
            width: 420,
            padding: 28,
            boxShadow: "var(--shadow, 0 10px 30px rgba(0,0,0,0.55))",
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                color: "var(--lime)",
                fontWeight: 900,
                letterSpacing: 0.6,
                marginBottom: 8,
              }}
            >
              PROFIT PORTAL
            </div>

            <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
              Sign In
            </div>
          </div>

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 1,
                  color: "var(--text-faint)",
                }}
              >
                EMAIL
              </span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                autoComplete="email"
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 1,
                  color: "var(--text-faint)",
                }}
              >
                PASSWORD
              </span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                autoComplete="current-password"
              />
            </label>

            <PrimaryButton type="submit" disabled={loading} style={{ marginTop: 8, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Signing in..." : "Sign In"}
            </PrimaryButton>

            {status ? (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: status.startsWith("Error")
                    ? "rgba(255,108,108,0.95)"
                    : "var(--text-muted)",
                }}
              >
                {status}
              </div>
            ) : null}
          </form>
        </Card>
      </div>
    </Container>
  );
}