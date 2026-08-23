"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  /** Delay animasi dalam detik (untuk efek berurutan). */
  delay?: number;
  className?: string;
  /** Arah masuk: up (default), down, left, right. */
  from?: "up" | "down" | "left" | "right";
}

/** Wrapper animasi masuk saat elemen pertama kali terlihat di viewport
 *  (IntersectionObserver, sekali jalan). Fallback: langsung tampil. */
export function Reveal({ children, delay = 0, className, from = "up" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hiddenTransform = {
    up: "translate-y-6",
    down: "-translate-y-6",
    left: "translate-x-6",
    right: "-translate-x-6",
  }[from];

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}s` }}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform",
        visible ? "translate-x-0 translate-y-0 opacity-100" : cn("opacity-0", hiddenTransform),
        className
      )}
    >
      {children}
    </div>
  );
}
