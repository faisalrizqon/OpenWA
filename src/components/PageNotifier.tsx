"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export interface PageNotification {
  type: "success" | "error" | "info" | "warning";
  message: string;
}

/** Menerjemahkan notifikasi hasil aksi (dari searchParams server page)
 *  menjadi toast melayang — dipasang sekali per halaman, hilang otomatis. */
export function PageNotifier({ notifications }: { notifications: PageNotification[] }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || notifications.length === 0) return;
    fired.current = true;
    for (const n of notifications) {
      // Use larger fonts and better visibility for important actions
      const commonOptions = {
        duration: 6000,           // Longer duration (6s instead of default 4s)
        className: "",            // Custom inline styles below
        style: {
          fontSize: '18px',       // Big readable font
          fontWeight: '600',
          padding: '12px 16px',  // More spacious
          borderRadius: '8px',
          border: '2px solid rgba(0,0,0,0.1)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      };
      
      if (n.type === "success") 
        toast.success(n.message, commonOptions);
      else if (n.type === "error") 
        toast.error(n.message, commonOptions);
      else if (n.type === "warning") 
        toast.warning(n.message, commonOptions);
      else 
        toast.info(n.message, commonOptions);
    }
  }, [notifications]);

  return null;
}
