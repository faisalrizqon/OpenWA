import { NextResponse } from "next/server";
import { pingDashboard, pingGateway } from "@/lib/openwa-api-client";

/**
 * Proxy health check OpenWA: API gateway (2785) + dashboard UI (2886).
 * Server-side fetch menghindari masalah CORS dari browser.
 */
export async function GET() {
  const [api, dashboard] = await Promise.all([pingGateway(), pingDashboard()]);

  return NextResponse.json({
    status: api && dashboard ? "online" : "offline",
    api: api ? "online" : "offline",
    dashboard: dashboard ? "online" : "offline",
  });
}
