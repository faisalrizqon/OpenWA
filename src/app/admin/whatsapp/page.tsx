import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OpenWATabs, OPENWA_TAB_IDS } from "@/components/OpenWATabs";
import {
  openwaConfigured,
  pingGateway,
  pingDashboard,
  listSessions,
  getSessionQr,
  resolveSessionId,
  openwaDeploymentMode,
  resolveDashboardUrl,
} from "@/lib/openwa-api-client";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { BackLink } from "@/components/BackLink";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DeploymentModeForm } from "@/components/DeploymentModeForm";
import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle2, QrCode, ExternalLink, BookOpen, Settings } from "lucide-react";
import { GatewayToggleForm } from "@/components/GatewayToggleForm";
import { OpenWAManagement } from "@/components/OpenWAManagement";
import { ReminderTab } from "@/components/ReminderTab";
import { getReminderSettings } from "@/lib/reminders/config";

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
  } else if (sp.success === "set-mode") {
    const m = Array.isArray(sp.mode) ? sp.mode[0] : sp.mode;
    notifications.push({
      type: "success",
      message: m === "split"
        ? "Mode deployment: Option B — Local Development (API + Vite dev server). Gunakan Stop lalu Start untuk menerapkan."
        : "Mode deployment: Option A — Docker/Bundled (1 proses, hemat resource). Gunakan Stop lalu Start untuk menerapkan.",
    });
  } else if (sp.error) {
    const msg = Array.isArray(sp.error) ? sp.error[0] : sp.error;
    notifications.push({ type: "error", message: decodeURIComponent(msg) });
  }

  // URL UI dashboard mengikuti mode deployment aktif — bundled → origin gateway (:2785
  // menyajikan UI), split → Vite dev server (:2886). Dipakai shortcut + iframe di bawah
  // supaya tab Dashboard tidak "refused to connect" saat env menunjuk port yang mati.
  const dashboardUrl = await resolveDashboardUrl();

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
            href={dashboardUrl}
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
        {tab === "dashboard" && <DashboardTab dashboardBaseUrl={dashboardUrl} />}
        {tab === "setup" && <SetupTab />}
        {tab === "reminder" && <ReminderTabWrapper />}
      </div>
    </div>
  );
}

// --- Tab 1: Dashboard dengan iframe ---
function DashboardTab({ dashboardBaseUrl }: { dashboardBaseUrl: string }) {
  // Auto-login via fragment hash bawaan dashboard OpenWA (`/#key=...`). URL dasar
  // mengikuti mode deployment (dihitung di induk via resolveDashboardUrl).
  let autoLoginUrl;
  if (process.env.OPENWA_API_KEY) {
    autoLoginUrl = `${dashboardBaseUrl}/#key=${encodeURIComponent(process.env.OPENWA_API_KEY)}`;
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
  const deploymentMode = openwaDeploymentMode();
  // Bundled: UI disajikan proses gateway itu sendiri (tidak ada proses kedua untuk diping).
  // Split: ping Vite dev server secara terpisah.
  const dashboardRunning = deploymentMode === "split" ? await pingDashboard() : gatewayRunning;
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
    dashboardPort = new URL(process.env.OPENWA_DASHBOARD_URL ?? "http://localhost:2785/dashboard").port || "2886";
  } catch {
    /* biarkan default */
  }

  return (
    <div className="space-y-6">
      {/* Mode Deployment — istilah mengikuti Quick Start docs OpenWA (Option A / Option B).
          Pengganti pola on/off buta yang selalu menjalankan DUA proses sekaligus. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-5" aria-hidden />
            Mode Deployment OpenWA
          </CardTitle>
          <CardDescription>
            Sesuai Quick Start docs OpenWA — pilih SATU opsi, jangan keduanya (boros resource).
            Perubahan berlaku tanpa restart; tombol Start/Stop di bawah mengikuti mode ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeploymentModeForm mode={deploymentMode} />
        </CardContent>
      </Card>

      {/* Gateway Status */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Status OpenWA</CardTitle>
              <CardDescription>
                {deploymentMode === "bundled"
                  ? `Option A (Docker/Bundled): SATU proses — API + UI dashboard di port ${gatewayPort}`
                  : `Option B (Local Dev): DUA proses — API di port ${gatewayPort} + Vite dev server di port ${dashboardPort}`}{" "}
                — dikontrol langsung dari halaman ini
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
                <p className="text-xs font-medium leading-snug text-muted-foreground">
                  {deploymentMode === "bundled" ? "OpenWA (API + Dashboard)" : "API Gateway"}
                </p>
                <p className={gatewayRunning ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>
                  {gatewayRunning ? "Ready" : "Offline"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${dashboardRunning ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-600"}`}>
                <QrCode className="size-4.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium leading-snug text-muted-foreground">
                  {deploymentMode === "bundled" ? "Dashboard (bundled :2785)" : "Dashboard (Vite dev :2886)"}
                </p>
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
          <div className="flex justify-between items-center gap-2">
            <span className="font-medium">API Docs:</span>
            <a href={apiDocsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
              {apiDocsUrl} <ExternalLink className="size-3.5" aria-hidden />
            </a>
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

// --- Tab 3: Reminder COD (pengaturan advance) ---
async function ReminderTabWrapper() {
  const settings = await getReminderSettings();
  return <ReminderTab settings={settings} />;
}
