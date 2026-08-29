import { ShieldCheck, Clock, Star } from "lucide-react";
import { type StoreSettings } from "@/lib/shop";

export function TrustChips({ settings }: { settings?: StoreSettings }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden />
        {settings?.trustBadge1 ?? "Jaminan KTP / kartu pelajar"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock className="size-3.5 text-emerald-600" aria-hidden />
        {settings?.trustBadge2 ?? "Setiap hari · 08.00 – 21.00"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Star className="size-3.5 fill-amber-500 text-amber-500" aria-hidden />
        {settings?.trustBadge3 ?? "Dipercaya pelajar Weleri"}
      </span>
    </div>
  );
}
