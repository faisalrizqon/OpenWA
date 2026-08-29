"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
type PortStatus = {
  status: "online" | "offline";
  api: "online" | "offline";
  dashboard: "online" | "offline";
};

export function OpenWADashboardFrame({
  dashboardBaseUrl = "http://localhost:2886",
  autoLoginUrl,
}: {
  dashboardBaseUrl?: string;
  autoLoginUrl?: string;
}) {
  const [health, setHealth] = useState<PortStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/proxy/openwa-health");
      if (res.ok) {
        setHealth(await res.json());
      } else {
        setHealth(null);
      }
    } catch {
      setHealth(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void checkStatus();
  }, []);

  const apiOnline = health?.api === "online";
  const dashboardOnline = health?.dashboard === "online";
  const allOnline = apiOnline && dashboardOnline;

  const hasAutoLogin = Boolean(autoLoginUrl);

  return (
    <div className="space-y-4">
      {/* Dashboard Iframe */}
      <Card className={cn(isMaximized ? "rounded-xl" : "")}>
        <CardHeader className={cn(
          "flex flex-row items-center justify-between space-y-0 pb-3",
          !isMaximized && "border-b bg-muted/30 p-3.5 rounded-t-lg"
        )}>
          {!isMaximized && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-2">
                <Activity className="size-5 text-muted-foreground" aria-hidden />
                <CardTitle className="text-base">OpenWA Gateway</CardTitle>
              </div>
              <PortBadge label="API :2785" online={apiOnline} loading={checking} />
              <PortBadge label="Dashboard :2886" online={dashboardOnline} loading={checking} />
            </div>
          )}
          <div className="flex items-center gap-1">
            {/* Dashboard Auto-Login link */}
            {hasAutoLogin ? (
              <a
                href={autoLoginUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline text-primary text-sm font-medium"
              >
                Dashboard Auto-Login <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : (
              <Link
                href={`${dashboardBaseUrl}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline text-primary text-sm font-medium"
              >
                Dashboard <ExternalLink className="size-3.5" aria-hidden />
              </Link>
            )}
            {/* Refresh button - thin */}
            <Button 
              size="xs" 
              variant="outline" 
              onClick={() => void checkStatus()} 
              disabled={checking}
              className="h-7 px-2 text-xs font-normal"
            >
              {checking ? "Checking…" : "Refresh"}
            </Button>
            
            {/* Maximize/Minimize button - thin icon only */}
            <Button
              size="icon"
              variant="outline"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Collapse view" : "Expand view"}
              className="h-7 w-7 rounded-md p-0 bg-transparent border-gray-300 dark:border-gray-600"
            >
              {isMaximized ? (
                <Minimize2 className="size-3.5 text-current" aria-hidden />
              ) : (
                <Maximize2 className="size-3.5 text-current" aria-hidden />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {allOnline ? (
            <iframe
              key="autoLogin"
              src={autoLoginUrl || dashboardBaseUrl + "/"}
              className={cn(
                "w-full bg-white transition-all duration-300",
                isMaximized ? "h-[700px]" : "h-[500px]"
              )}
              style={{ opacity: iframeLoaded ? 1 : 0, transition: "opacity 0.3s ease-in-out" }}
              title="OpenWA Dashboard"
              onLoad={() => setIframeLoaded(true)}
            />
          ) : (
            <div className={cn(
              "flex h-[400px] items-center justify-center rounded-lg border",
              health && !allOnline ? "bg-red-50 dark:bg-red-950/20" : "bg-muted"
            )}>
              <div className="text-center space-y-2 px-6">
                {checking ? (
                  <p className="text-sm text-muted-foreground">Checking ports…</p>
                ) : !apiOnline ? (
                  <>
                    <p className="text-sm font-medium text-red-600">Gateway API offline (port 2785)</p>
                    <p className="text-xs text-muted-foreground">
                      Start OpenWA API server first — see WA-SETUP-GUIDE.md
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-red-600">Dashboard UI offline (port 2886)</p>
                    <p className="text-xs text-muted-foreground max-w-md">
                      API gateway berjalan, tapi dashboard UI belum start. Jalankan{" "}
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                        npm run dashboard:dev
                      </code>{" "}
                      di folder openwa-server, lalu klik Refresh.
                    </p>
                  </>
                )}
                {!checking && (
                  <Button size="sm" variant="outline" onClick={() => void checkStatus()}>
                    Coba lagi
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PortBadge({ label, online, loading }: { label: string; online: boolean | undefined; loading: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        loading
          ? "bg-muted text-muted-foreground"
          : online
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
      )}
    >
      <span className={cn("size-1.5 rounded-full", loading ? "bg-muted-foreground" : online ? "bg-emerald-500" : "bg-red-500")} aria-hidden />
      {label}
    </span>
  );
}
