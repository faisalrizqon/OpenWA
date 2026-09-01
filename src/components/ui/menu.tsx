"use client"

import type * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"

import { MoreVertical } from "lucide-react"

import { cn } from "@/lib/utils"

const Menu = MenuPrimitive.Root

function MenuTrigger({ className, children, ...props }: MenuPrimitive.Trigger.Props) {
  return (
    <MenuPrimitive.Trigger
      data-slot="menu-trigger"
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          <MoreVertical className="size-4" aria-hidden />
          <span className="sr-only">Buka menu aksi</span>
        </>
      )}
    </MenuPrimitive.Trigger>
  )
}

function MenuContent({
  className,
  align = "end",
  side = "bottom",
  sideOffset = 6,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        collisionBoundary="clipping-ancestors"
        collisionPadding={16}
        className="isolate z-[9999] transition-none"
      >
        <MenuPrimitive.Popup
          data-slot="menu-content"
          className={cn(
            "min-w-[180px] rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg outline-none transition-none",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function MenuItem({ className, disabled, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors select-none",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        disabled && "data-[disabled]:opacity-50",
        className,
      )}
      disabled={disabled}
      {...props}
    />
  )
}

/** Item menu berupa link navigasi (meng-render anchor). */
function MenuLinkItem({ className, href, children, target, rel, ...props }: Omit<MenuPrimitive.LinkItem.Props, "href" | "children"> & { href: string; children?: React.ReactNode }) {
  return (
    <MenuPrimitive.LinkItem
      data-slot="menu-link-item"
      href={href}
      target={target}
      rel={rel}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors select-none",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </MenuPrimitive.LinkItem>
  )
}

/** Item menu destruktif (hapus) — merah. */
function MenuDestructiveItem({ className, disabled, onClick, ...props }: MenuPrimitive.Item.Props & { onClick?: () => void }) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-destructive-item"
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-red-600 outline-none transition-colors select-none",
        "data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700",
        "dark:text-red-400 dark:data-[highlighted]:bg-red-950/40 dark:data-[highlighted]:text-red-300",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      {...props}
    />
  )
}

function MenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

export {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuDestructiveItem,
  MenuSeparator,
}
