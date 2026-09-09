import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { drainOutbox } from "@/lib/jobs/worker";
import { sweepExpiredHolds } from "@/lib/inventory";
import { pullOpportunityUpdates } from "@/lib/integrations/salesforce/sync";
import { syncCheckIns } from "@/lib/integrations/speakeasy";

export const dynamic = "force-dynamic";

const PULL_WINDOW_MS = 15 * 60_000;

/**
 * Single scheduler entrypoint — a cron caller hits this every few minutes with
 * the job token. Keeping every periodic task here means one secret and one
 * place to reason about ordering.
 */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token !== env().JOB_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - PULL_WINDOW_MS);
  const releasedHolds = await sweepExpiredHolds();
  const outbox = await drainOutbox();

  let opportunitiesPulled = 0;
  if (env().SALESFORCE_ENABLED) {
    opportunitiesPulled = await pullOpportunityUpdates();
  }

  let checkIns = 0;
  if (env().SPEAKEASY_ENABLED) {
    const live = await prisma.raceEdition.findMany({
      where: { startsAt: { lte: new Date() }, endsAt: { gte: since } },
      select: { id: true },
    });
    for (const edition of live) {
      checkIns += await syncCheckIns(edition.id, since);
    }
  }

  return NextResponse.json({ releasedHolds, outbox, opportunitiesPulled, checkIns });
}
