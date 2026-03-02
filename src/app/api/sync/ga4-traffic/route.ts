// src/app/api/sync/ga4-traffic/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function parseServiceAccountJson(): { client_email: string; private_key: string } {
  const raw = getEnv("GA4_SERVICE_ACCOUNT_JSON");

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "GA4_SERVICE_ACCOUNT_JSON is not valid JSON. Ensure it's the full service-account JSON string on ONE line, wrapped in single quotes in .env.local."
    );
  }

  if (!parsed?.client_email || !parsed?.private_key) {
    throw new Error("GA4_SERVICE_ACCOUNT_JSON missing client_email/private_key.");
  }

  return {
    client_email: parsed.client_email,
    // Convert literal "\\n" to real newlines if needed
    private_key:
      typeof parsed.private_key === "string"
        ? parsed.private_key.replace(/\\n/g, "\n")
        : parsed.private_key,
  };
}

async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    }
  );
}

function gaDateToISO(d: string): string {
  // GA returns YYYYMMDD
  if (!/^\d{8}$/.test(d)) return d;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

export async function POST() {
  try {
    // 1) Require logged-in session
    const supabase = await getSupabaseServerClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2) GA client
    const propertyId = getEnv("GA4_PROPERTY_ID");
    const { client_email, private_key } = parseServiceAccountJson();
    const ga = new BetaAnalyticsDataClient({
      credentials: { client_email, private_key },
    });

    // 3) Pull last 12 months (daily, by source/medium)
    // Keep it bounded. You can widen later.
    const [report] = await ga.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "365daysAgo", endDate: "today" }],
      dimensions: [{ name: "date" }, { name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "screenPageViews" }],
      limit: 100000, // adjust later if needed
    });

    const rows = report?.rows ?? [];

    const mapped = rows.map((r) => {
      const dateRaw = r.dimensionValues?.[0]?.value ?? "";
      const source = r.dimensionValues?.[1]?.value ?? "(not set)";
      const medium = r.dimensionValues?.[2]?.value ?? "(not set)";

      const sessions = Number(r.metricValues?.[0]?.value ?? "0");
      const users = Number(r.metricValues?.[1]?.value ?? "0");
      const pageviews = Number(r.metricValues?.[2]?.value ?? "0");

      return {
        date: gaDateToISO(dateRaw), // YYYY-MM-DD
        source,
        medium,
        sessions,
        users,
        pageviews,
      };
    });

    // 4) Upsert into Supabase
    // Use anon key + RLS: this endpoint requires an authenticated session,
    // but the table must allow inserts for authed users OR you can later
    // swap to service role server client. We'll handle if you hit RLS.
    const { error: upsertErr } = await supabase
      .from("ga4_daily_traffic")
      .upsert(mapped, { onConflict: "date,source,medium" });

    if (upsertErr) throw upsertErr;

    return NextResponse.json({
      ok: true,
      debug: {
        propertyId,
        authedUser: authData.user.email ?? authData.user.id,
        fetchedRows: rows.length,
        upsertedRows: mapped.length,
        sampleMappedRow: mapped[0] ?? null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}