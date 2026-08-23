"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VariantSwitcher } from "@/components/VariantSwitcher";

const BG_CLASSES = ["theme-y2k", "theme-album", "theme-mono", "theme-coquette"];
const VALID = ["y2k", "album", "mono", "coquette"];

/** Terapkan tema background (dari ?bg=) ke body + tampilkan switcher preview. */
function ShopThemeInner() {
  const searchParams = useSearchParams();
  const bg = searchParams.get("bg") ?? "y2k";

  useEffect(() => {
    document.body.classList.remove(...BG_CLASSES);
    if (VALID.includes(bg)) {
      document.body.classList.add(`theme-${bg}`);
    }
    return () => {
      document.body.classList.remove(...BG_CLASSES);
    };
  }, [bg]);

  return <VariantSwitcher />;
}

export function ShopTheme() {
  return (
    <Suspense fallback={null}>
      <ShopThemeInner />
    </Suspense>
  );
}
