import Link from "next/link";
import {
  Settings,
  Image,
  Sparkles,
  Star,
  Clapperboard,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Definisi tab halaman Kelola Konten — satu sumber untuk navigasi & validasi query. */
export const CONTENT_TABS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "settings", label: "Pengaturan Toko", icon: Settings },
  { id: "hero", label: "Foto Hero", icon: Image },
  { id: "perks", label: "Kartu Keunggulan", icon: Sparkles },
  { id: "testimonials", label: "Testimoni", icon: Star },
  { id: "videos", label: "Video & Tutorial", icon: Clapperboard },
];

export const CONTENT_TAB_IDS = CONTENT_TABS.map((t) => t.id);

/** Navigasi tab halaman Kelola Konten (state tab lewat query string ?tab=). */
export function ContentTabs({ active }: { active: string }) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-2xl border bg-card p-1.5 shadow-sm">
      {CONTENT_TABS.map((t) => {
        const Icon = t.icon;
        const isActive = t.id === active;
        return (
          <Link
            key={t.id}
            href={`/admin/content?tab=${t.id}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
