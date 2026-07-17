"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * SRCA AI Workspace sidebar branding. The Saudi Red Crescent Authority crest is a full-colour
 * emblem, so it always sits on a white chip — legible on the dark sidebar and on light surfaces
 * alike — beside the product name.
 *
 * Expanded: the crest chip · the product name (the primary focus, never truncated), vertically
 * centred in a fixed-height header beside the collapse control. Collapsed: only the crest chip,
 * centred — the app's compact identity. The two states cross-fade in place.
 *
 * Theme-aware (`theme`): dark product name on light surfaces, white on the dark sidebar (default).
 */
export function SidebarBrand({
  name,
  href,
  collapsed,
  onToggle,
  theme = "dark",
}: {
  /** Product name shown beside the crest, e.g. "SRCA AI Workspace". The primary focus. */
  name: string;
  /** Where the brand links when expanded. */
  href: string;
  collapsed: boolean;
  onToggle: () => void;
  theme?: "dark" | "light";
}) {
  const dark = theme !== "light";
  const nameCls = dark ? "text-white" : "text-[#14181f]";
  const sepCls = dark ? "bg-white/20" : "bg-black/10";
  const btnCls = dark
    ? "border-white/10 text-white/45 hover:bg-white/10 hover:text-white"
    : "border-black/10 text-[#14181f]/45 hover:bg-black/5 hover:text-[#14181f]";

  // The full-colour crest, always on a white chip so it reads on any surface.
  const Crest = ({ size }: { size: number }) => (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5"
      style={{ height: size, width: size, padding: size * 0.14 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/srca-mark.svg" alt="Saudi Red Crescent Authority" className="h-full w-full object-contain" />
    </span>
  );

  return (
    <div className="relative flex h-16 shrink-0 items-center overflow-hidden border-b border-white/5">
      {/* Collapsed identity — the crest chip, centred. Click to expand. */}
      <button
        type="button"
        onClick={onToggle}
        aria-label="Expand sidebar"
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-300 ease-out",
          collapsed ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <Crest size={34} />
      </button>

      {/* Expanded brand — crest · product name + collapse control. Cross-fades with the chip. */}
      <div
        className={cn(
          "flex w-full items-center gap-3 px-4 transition-opacity duration-300 ease-out",
          collapsed ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        <Link href={href} aria-label={`${name} — home`} className="flex items-center gap-3">
          <Crest size={34} />
          <span className={cn("h-6 w-px shrink-0", sepCls)} aria-hidden />
          <span className={cn("whitespace-nowrap text-sm font-semibold tracking-wide", nameCls)}>
            {name}
          </span>
        </Link>
        <button
          type="button"
          onClick={onToggle}
          title="Collapse"
          aria-label="Collapse sidebar"
          className={cn(
            "ms-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors",
            btnCls,
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
