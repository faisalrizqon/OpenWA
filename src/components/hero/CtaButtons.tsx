import { ArrowRight } from "lucide-react";
import { waLink, generalMessage, type StoreSettings } from "@/lib/shop";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { cn } from "@/lib/utils";

export function CtaButtons({ settings, size = "lg" }: { settings: StoreSettings; size?: "lg" | "md" }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={waLink(settings.whatsapp, generalMessage(settings.storeName))}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "btn-retro inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white transition-colors hover:bg-emerald-700",
          size === "lg" ? "h-12 text-sm md:text-base" : "h-10 text-sm"
        )}
      >
        <WhatsAppIcon aria-hidden />
        Pesan via WhatsApp
      </a>
      <a
        href="#katalog"
        className={cn(
          "btn-retro inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 font-semibold transition-colors hover:bg-accent",
          size === "lg" ? "h-12 text-sm md:text-base" : "h-10 text-sm"
        )}
      >
        Lihat katalog
        <ArrowRight className="size-4" aria-hidden />
      </a>
    </div>
  );
}
