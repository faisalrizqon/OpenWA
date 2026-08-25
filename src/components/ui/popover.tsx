"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

function PopoverContent({
  className,
  align = "start",
  side = "bottom",
  sideOffset = 8,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        collisionBoundary="clipping-ancestors"
        collisionPadding={16}
        className="isolate z-[9999]"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "relative max-h-[min(var(--available-height),90vh)] w-max overflow-auto rounded-2xl border bg-popover p-4 text-popover-foreground shadow-lg outline-none",
            "[&_button]:!mb-1 [&_button]:!mt-0",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { PopoverContent };
