import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Link bergaya tombol utama — untuk CTA "+ Tambah X" di header halaman. */
export function HeaderLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant: "default" }), "gap-1.5")}>
      <Plus className="size-4" aria-hidden />
      {label}
    </Link>
  );
}
