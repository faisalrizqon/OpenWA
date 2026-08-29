"use client";

import { useEffect } from "react";

/**
 * Component untuk hide animated backgrounds saat masuk Portal/Admin.
 * 
 * ShopTheme component menambahkan kelas tema ke document.body dengan efek
 * background animated (::before pseudo-element). Ini bocor ke Portal/Admin
 * karena mereka share body element yang sama.
 * 
 * Solusi: Gunakan CSS inline style tag untuk hide semua animations saat di
 * area Portal/Admin.
 */
export function ResetThemePortalAdmin() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      /* Hide ALL entrance animations that would otherwise bleed into admin/portal areas */
      
      /* Hide animated backgrounds (::before pseudo-elements from themes) */
      body.theme-y2k::before,
      body.theme-mono::before,
      body.theme-coquette::before {
        display: none !important;
        opacity: 0 !important;
      }
      
      /* Hide all entrance animations (fade-up, fade-in, pop, float, etc.) */
      .animate-fade-up,
      .animate-fade-in,
      .animate-pop,
      .animate-float,
      .animate-kenburns,
      .animate-blink,
      .animate-shine,
      .animate-sign-sway {
        animation: none !important;
        transition: none !important;
      }
      
      /* Disable hover transform animations completely */
      [class*="hover:-translate"],
      [class*="hover:scale"],
      [class*="hover:rotate"] {
        transition: none !important;
        transform: none !important;
      }
    `;
    
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null;
}
