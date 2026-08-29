/**
 * Tab navigasi untuk Admin WhatsApp — pola sama dengan ContentTabs
 */

import Link from "next/link";
import { MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface OpenWANavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const OPENWA_TABS: OpenWANavItem[] = [
  { id: "dashboard", label: "Dashboard WA", icon: MessageSquare },
  { id: "setup", label: "Setup & Konfigurasi", icon: Settings },
];

export const OPENWA_TAB_IDS = OPENWA_TABS.map((t) => t.id);

export function OpenWATabs({ active }: { active: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPENWA_TABS.map((t) => {
        const Icon = t.icon;
        const isActive = t.id === active;
        return (
          <Link
            key={t.id}
            href={`/admin/whatsapp?tab=${t.id}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
