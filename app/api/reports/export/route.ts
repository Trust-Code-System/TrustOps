import { type NextRequest } from "next/server";
import { getSessionContext } from "@/modules/auth/session";
import {
  getReportData,
  normalizeRange,
  reportToCsv,
} from "@/modules/analytics/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/export?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Streams a period summary as CSV. All reads run under the caller's RLS context
 * (company-scoped) via getReportData; an unauthenticated request is rejected.
 */
export async function GET(request: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return new Response("Not authenticated", { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const range = normalizeRange({
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
  });

  const report = await getReportData(range);
  const csv = reportToCsv(report);
  const filename = `trustops-report_${range.from}_${range.to}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
