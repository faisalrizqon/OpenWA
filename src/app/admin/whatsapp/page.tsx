import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { OpenWATabs, OPENWA_TAB_IDS } from "@/components/OpenWATabs";
import { openwaConfigured, pingGateway, pingDashboard, listSessions, getSessionQr, resolveSessionId } from "@/lib/openwa-api-client";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { HeaderLink } from "@/components/HeaderLink";
import { EmptyState } from "@/components/EmptyState";
import { BackLink } from "@/components/BackLink";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle2, QrCode, ExternalLink, BookOpen } from "lucide-react";
import { GatewayToggleForm } from "@/components/GatewayToggleForm";
import { OpenWAManagement } from "@/components/OpenWAManagement";

export default async function AdminWhatsAppPage({ searchParams }: PageProps<"/admin/whatsapp">) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "mitra")) {
    redirect("/login");
  }

  const sp = await searchParams;
  const tab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab ?? "dashboard";
  const isTabValid = (OPENWA_TAB_IDS as readonly string[]).includes(tab);
  if (!isTabValid) {
    redirect("/admin/whatsapp?tab=dashboard");
  }

  const notifications: PageNotification[] = [];
  if (sp.success === "qr") {
    notifications.push({ type: "success", message: "QR code berhasil di-generate!" });
  } else if (sp.success === "start-openwa") {
    notifications.push({ type: "success", message: "Gateway & dashboard OpenWA berhasil dijalankan" });
  } else if (sp.success === "stop-openwa") {
    notifications.push({ type: "success", message: "Gateway & dashboard OpenWA berhasil dihentikan" });
  } else if (sp.success === "start-gateway") {
    notifications.push({ type: "success", message: "Gateway OpenWA berhasil dijalankan" });
  } else if (sp.success === "stop-gateway") {
    notifications.push({ type: "success", message: "Gateway OpenWA berhasil dihentikan" });
  } else if (sp.error) {
    const msg = Array.isArray(sp.error) ? sp.error[0] : sp.error;
    notifications.push({ type: "error", message: decodeURIComponent(msg) });
  }

  return (
    <div className="space-y-6">
      {/* Navigasi halaman — di luar card */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card p-4 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">WhatsApp</h1>
        <BackLink href="/admin" label="Kembali" />
      </div>
      <PageNotifier notifications={notifications} />

      <OpenWATabs active={tab} />
      {/* Quick Shortcuts — only on dashboard tab */}
      {tab === "dashboard" && (
        <div className="flex flex-wrap gap-3 rounded-lg border bg-card p-3">
          <a
            href={process.env.OPENWA_DASHBOARD_URL ?? "http://localhost:2886"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <ExternalLink className="size-4" aria-hidden />
            Buka Dashboard WA
          </a>
          <a
            href={`${process.env.OPENWA_URL ?? "http://localhost:2785"}/api/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <BookOpen className="size-4" aria-hidden />
            API Docs
          </a>
        </div>
      )}
      <div className="mt-4 space-y-6">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "setup" && <SetupTab />}
      </div>
    </div>
  );
}

// --- Tab 1: Dashboard dengan iframe ---
function DashboardTab() {
  const dashboardBaseUrl = (process.env.OPENWA_DASHBOARD_URL ?? "http://localhost:2886").replace(/\/+$/, "");
  
  // Try different API key formats that OpenWA Dashboard might accept
  let autoLoginUrl;
  if (process.env.OPENWA_API_KEY) {
    const apiKey = process.env.OPENWA_API_KEY;
    
    // Format 1: #key= prefix (original OpenWA style)
    const format1 = `${dashboardBaseUrl}/#key=${encodeURIComponent(apiKey)}`;
    
    // Format 2: ?api_key= (query param)
    const format2 = `${dashboardBaseUrl}/login?api_key=${encodeURIComponent(apiKey)}`;
    
    // Format 3: ?key= (simple query param)
    const format3 = `${dashboardBaseUrl}/login?key=${encodeURIComponent(apiKey)}`;
    
    // Use format1 by default (change based on what works for your setup)
    autoLoginUrl = format1;
  }
  
  return (
    <iframe 
      src={autoLoginUrl}
      className="w-full h-[95vh] min-h-[800px] rounded-xl border border-border"
      title="OpenWA Dashboard"
      allow="clipboard-write"
    />
  );
}

// --- Tab 2: Setup & Konfigurasi ---
async function SetupTab() {
  const configured = openwaConfigured();
  const gatewayRunning = await pingGateway();
  const dashboardRunning = await pingDashboard();
  const sessions = gatewayRunning ? await listSessions().catch(() => []) : [];
  const apiDocsUrl = `${process.env.OPENWA_URL ?? "http://localhost:2785"}/api/docs`;
  let gatewayPort = "2785";
  try {
    gatewayPort = new URL(process.env.OPENWA_URL ?? "http://localhost:2785").port || "2785";
  } catch {
    /* biarkan default */
  }
  let dashboardPort = "2886";
  try {
    dashboardPort = new URL(process.env.OPENWA_DASHBOARD_URL ?? "http://localhost:2886").port || "2886";
  } catch {
    /* biarkan default */
  }

  // Session utama (dari env OPENWA_SESSION_ID, by UUID atau nama)
  const primarySessionId = await resolveSessionId().catch(() => null);

  // QR hanya diambil bila ada session yang menunggu scan
  const qrSession = sessions.find((s) => s.status === "qr_ready" || s.status === "qr_pending");
  const qrCode = qrSession ? await getSessionQr(qrSession.id).catch(() => null) : null;

  return (
    <div className="space-y-6">
      {/* Gateway Status */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Status Gateway</CardTitle>
              <CardDescription>
                Gateway API (backend) di port {gatewayPort} • Dashboard UI (Vite) di port {dashboardPort} — gateway dikontrol langsung dari halaman ini
              </CardDescription>
            </div>
            <GatewayToggleForm running={gatewayRunning && dashboardRunning} partialRunning={gatewayRunning || dashboardRunning} />
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${gatewayRunning ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                <CheckCircle2 className="size-4.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium leading-snug text-muted-foreground">Gateway</p>
                <p className={gatewayRunning ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>
                  {gatewayRunning ? "Running" : "Offline"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${dashboardRunning ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-600"}`}>
                <QrCode className="size-4.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium leading-snug text-muted-foreground">Dashboard</p>
                <p className={dashboardRunning ? "font-semibold text-blue-600" : "font-semibold text-gray-600"}>
                  {dashboardRunning ? "Ready" : "Offline"}
                </p>
              </div>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Configuration</CardTitle>
          <CardDescription>Environment variables & session setup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center gap-2">
            <span className="font-medium">API Key Configured:</span>
            <Badge className={configured ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-600 hover:bg-red-700"}>
              {configured ? "Yes" : "No"}
            </Badge>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="font-medium">Default Session ID:</span>
            <code className="rounded bg-muted px-2 py-1 text-xs">
              {process.env.OPENWA_SESSION_ID || "Not set"}
            </code>
          </div>
          {!configured && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
              Set environment variables di .env file lalu restart dev server
            </div>
          )}
        </CardContent>
      </Card>

      {/* OpenWA Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Manajemen OpenWA</CardTitle>
          <CardDescription>Periksa dan instal update otomatis</CardDescription>
        </CardHeader>
        <CardContent>
          <OpenWAManagement />
        </CardContent>
      </Card>

      {/* Sessions Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="size-5" aria-hidden />
            WhatsApp Sessions
          </CardTitle>
          <CardDescription>
            Tampilan informasi sesi yang terdaftar (kelola via dashboard OpenWA)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Belum ada sesi terdaftar
            </p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((s) => {
                const isReady = s.status === "connected" || s.status === "ready";
                const isQr = s.status === "qr_ready";
                
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.phoneNumber ?? "Belum terhubung nomor"} · Dibuat {s.createdAt ? new Date(s.createdAt).toLocaleDateString("id-ID") : "-"}
                      </p>
                    </div>
                    <Badge className={isReady ? "bg-emerald-500" : isQr ? "bg-amber-500" : "bg-gray-500"}>
                      {isReady ? "Connected" : isQr ? "QR Ready" : s.status}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
