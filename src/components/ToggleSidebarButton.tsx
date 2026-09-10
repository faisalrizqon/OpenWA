"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { PanelLeft } from "lucide-react";

/** Tombol toggle hide/unhide sidebar desktop.
 *
 *  Tooltip pill gelap dirender via portal ke <body> dengan posisi fixed
 *  mengikuti rect tombol — sehingga tidak pernah terpotong oleh
 *  `overflow-hidden` rail sidebar saat collapsed. */
export function ToggleSidebarButton({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [rectTop, setRectTop] = useState(0);
  const [rectRight, setRectRight] = useState(0);

  const showTooltip = (
    e: React.MouseEvent<HTMLButtonElement> | React.FocusEvent<HTMLButtonElement>
  ) => {
    const r = e.currentTarget.getBoundingClientRect();
    setRectTop(r.top + r.height / 2);
    setRectRight(r.right + 10);
    setVisible(true);
  };
  const hideTooltip = () => setVisible(false);

  const label = collapsed ? "Perlebar sidebar" : "Persempit sidebar";

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        aria-label={label}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <PanelLeft className="size-5" aria-hidden />
      </button>

      {visible &&
        createPortal(
          <span
            role="tooltip"
            style={{ top: rectTop, left: rectRight }}
            className="pointer-events-none fixed z-[100] -translate-y-1/2 rounded-xl bg-foreground px-3.5 py-2 text-xs font-bold whitespace-nowrap text-background shadow-lg"
          >
            {label}
          </span>,
          document.body
        )}
    </>
  );
}
