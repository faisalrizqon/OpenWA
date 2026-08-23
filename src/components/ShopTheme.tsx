"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VariantSwitcher } from "@/components/VariantSwitcher";

const BG_CLASSES = ["theme-kertas", "theme-y2k", "theme-darkroom", "theme-album", "theme-pastel", "theme-sunset", "theme-mono", "theme-coquette"];

/** Terapkan tema background (dari ?bg=) ke body + tampilkan switcher preview. */
function ShopThemeInner() {
  const searchParams = useSearchParams();
  const bg = searchParams.get("bg") ?? "kertas";

  useEffect(() => {
    const cls = `theme-${bg} bg-grain`;
    document.body.classList.remove(...BG_CLASSES, "bg-grain");
    if (["kertas", "y2k", "darkroom", "album", "pastel", "sunset", "mono", "coquette"].includes(bg)) {
      document.body.classList.add(...cls.split(" "));
    }
    return () => {
      document.body.classList.remove(...BG_CLASSES, "bg-grain");
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
