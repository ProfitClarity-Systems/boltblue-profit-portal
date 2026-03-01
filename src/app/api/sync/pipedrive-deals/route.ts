// src/app/api/sync/pipedrive-deals/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/* -------------------------------------------------- */
/* Utils */
/* -------------------------------------------------- */

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function toDateOnly(value: any): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function toTimestamp(value: any): string | null {
  if (!value) return null;
  const s = String(value).trim();
  return s || null; // Postgres can parse ISO and "YYYY-MM-DD HH:MM:SS"
}

/* -------------------------------------------------- */
/* Supabase clients */
/* -------------------------------------------------- */

// For auth check (uses anon + cookies)
async function getSupabaseAuthed() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // ignore in route handlers
          }
        },
      },
    }
  );
}

// For DB writes (service role bypasses RLS) — SERVER ONLY
function getSupabaseService() {
  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // no-op
        },
      },
    }
  );
}

/* -------------------------------------------------- */
/* Pipedrive */
/* -------------------------------------------------- */

async function pipedriveFetchDealsPage(args: {
  baseUrl: string;
  apiToken: string;
  start: number;
  limit: number;
}) {
  const qs = new URLSearchParams({
    api_token: args.apiToken,
    start: String(args.start),
    limit: String(args.limit),
    status: "all_not_deleted",
  });

  const res = await fetch(`${args.baseUrl}/deals?${qs.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pipedrive error ${res.status}: ${text.slice(0, 800)}`);
  }

  return res.json();
}

/* -------------------------------------------------- */
/* GET helper */
/* -------------------------------------------------- */

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Use POST to trigger sync." },
    { status: 405 }
  );
}

/* -------------------------------------------------- */
/* POST — RUN SYNC */
/* -------------------------------------------------- */

export async function POST() {
  try {
    // Require logged-in session
    const supabaseAuthed = await getSupabaseAuthed();
    const {
      data: { user },
      error: userErr,
    } = await supabaseAuthed.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Service client for writes (bypasses RLS)
    const supabaseService = getSupabaseService();

    // Env
    const PIPEDRIVE_BASE_URL = requireEnv("PIPEDRIVE_BASE_URL"); // https://<subdomain>.pipedrive.com/api/v1
    const PIPEDRIVE_API_TOKEN = requireEnv("PIPEDRIVE_API_TOKEN");

    const QUALIFIED_KEY = requireEnv("PIPEDRIVE_FIELD_QUALIFIED_KEY");
    const MEETING_KEY = requireEnv("PIPEDRIVE_FIELD_SALES_MEETING_DATE_KEY");
    const LEADSOURCE_KEY = requireEnv("PIPEDRIVE_FIELD_LEADSOURCE_KEY");

    const pipelineName = "Leads";

    // Pagination
    let start = 0;
    const limit = 100;

    let totalFetched = 0;
    let totalConsidered = 0;
    let totalUpserted = 0;

    let sampleDeal: any = null;
    let sampleMappedRow: any = null;

    while (true) {
      const json = await pipedriveFetchDealsPage({
        baseUrl: PIPEDRIVE_BASE_URL,
        apiToken: PIPEDRIVE_API_TOKEN,
        start,
        limit,
      });

      const deals: any[] = json?.data ?? [];
      totalFetched += deals.length;

      // Keep one raw sample for debugging
      if (!sampleDeal && deals.length) sampleDeal = deals[0];

      // Filter to pipeline "Leads" (name filter; we’ll refine to pipeline_id if needed)
      const leadsPipelineId = Number(requireEnv("PIPEDRIVE_PIPELINE_ID_LEADS")); // set to 1
const leadsDeals = deals.filter((d) => Number(d?.pipeline_id) === leadsPipelineId);

      totalConsidered += leadsDeals.length;

      const rows = leadsDeals.map((d) => {
        const row = {
          deal_id: d.id,
          title: d.title ?? null,
          pipeline: "Leads",
          stage: d.stage_name ?? null,
          status: d.status ?? null,

          deal_created_at: toTimestamp(d.add_time),

          qualified_status: d[QUALIFIED_KEY] ? String(d[QUALIFIED_KEY]) : null,
          sales_meeting_date: toDateOnly(d[MEETING_KEY]),
          leadsource: d[LEADSOURCE_KEY] ? String(d[LEADSOURCE_KEY]) : null,

          won_time: toTimestamp(d.won_time),
          lost_time: toTimestamp(d.lost_time),

          last_synced_at: new Date().toISOString(),
        };

        if (!sampleMappedRow) sampleMappedRow = row;
        return row;
      });

      if (rows.length > 0) {
        const { error } = await supabaseService
          .from("pipedrive_deals")
          .upsert(rows, { onConflict: "deal_id" });

        if (error) throw new Error(`Supabase upsert failed: ${error.message}`);

        totalUpserted += rows.length;
      }

      const more =
        json?.additional_data?.pagination?.more_items_in_collection === true;

      if (!more) break;

      start =
        json?.additional_data?.pagination?.next_start ?? start + limit;

      if (deals.length === 0) break;
    }

    return NextResponse.json({
      ok: true,
      pipeline: pipelineName,
      fetched: totalFetched,
      considered: totalConsidered,
      upserted: totalUpserted,
      sampleMappedRow,
      // Helpful debug if we still see 0 considered:
      sampleDealPipelineFields: sampleDeal
        ? {
            pipeline_name: sampleDeal.pipeline_name ?? null,
            pipeline_id: sampleDeal.pipeline_id ?? null,
            stage_name: sampleDeal.stage_name ?? null,
            stage_id: sampleDeal.stage_id ?? null,
          }
        : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}