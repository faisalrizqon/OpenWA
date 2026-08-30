import { NextResponse } from "next/server";
import { pingDashboard, pingGateway, openwaDeploymentMode } from "@/lib/openwa-api-client";

/**
 * Proxy health check OpenWA: API gateway (2785) + dashboard UI (opsional port 2886).
 * Server-side fetch menghindari masalah CORS dari browser.
 *
 * Mode deployment menentukan apa yang di-ping (lihat openwa-api-client):
 *  - bundled → gateway menyajikan UI sendiri; tidak ada Vite dev server yang
 *    perlu diping — "dashboard" online iff gateway online.
 *  - split   → gateway API + Vite dev server berjalan terpisah; keduanya diping.
 */
export async function GET() {
  const mode = openwaDeploymentMode();
  const api = await pingGateway();

  // Mode bundled: dashboard online bila gateway online (UI disajikan dari proses
  // yang sama). Mode split: ping Vite dev server secara terpisah.
  const dashboard = mode === "split" ? await pingDashboard() : api;

  return NextResponse.json({
    mode,
    status: api && dashboard ? "online" : "offline",
    api: api ? "online" : "offline",
    dashboard: dashboard ? "online" : "offline",
  });
}
