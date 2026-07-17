"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hasPerm, type Session } from "@/lib/types";
import { NAV_GROUPS } from "@/lib/nav";
import { useT } from "@/lib/i18n";
import { useNavLabels } from "@/lib/i18n/nav";
import { SidebarBrand } from "@/components/layout/sidebar-brand";
import { StatusDot } from "@/components/ui/status-dot";

// Sidebar is ALWAYS a deep neutral graphite (theme-independent), so the warm SRCA
// red accent (flowing from --accent) reads cleanly against it. Neutral text/bg use
// fixed light-on-dark values.
const SIDEBAR_BG =
  "linear-gradient(180deg, #1a1618 0%, #131011 55%, #0c0a0b 100%)";

export function Sidebar({
  session,
  collapsed,
  onToggle,
}: {
  session: Session;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const perms = session.permissions;
  const t = useT();
  const labels = useNavLabels();

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => it.perm === null || hasPerm(perms, it.perm)),
  })).filter((g) => g.items.length > 0);

  return (
    <aside
      className={cn(
        // border-e (not border-r) so the edge sits against the content in RTL too.
        "flex flex-col border-e border-white/5 text-white transition-[width] duration-300 ease-out",
        collapsed ? "w-16" : "w-72",
      )}
      style={{ background: SIDEBAR_BG }}
    >
      <SidebarBrand name="SRCA AI Workspace" href="/workspace" collapsed={collapsed} onToggle={onToggle} />

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label}>
            {!collapsed ? (
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
                {labels.group(group.label)}
              </p>
            ) : (
              <div className="mx-2 mb-2 border-t border-white/10" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                const label = labels.item(item.href, item.label);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-accent/20 text-white"
                        : "text-white/65 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {active && (
                      // start-/rounded-e (logical) so the active bar hugs the correct edge in RTL.
                      <span className="absolute start-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-e bg-accent shadow-glow" />
                    )}
                    <span className="relative">
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          active ? "text-accent" : "text-white/50 group-hover:text-white",
                        )}
                      />
                      {item.live && (
                        <span className="absolute -end-1 -top-1">
                          <StatusDot tone="accent" pulse />
                        </span>
                      )}
                    </span>
                    {!collapsed && <span className="flex-1">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/5 p-3 text-[10px] uppercase tracking-[0.14em] text-white/30">
        {!collapsed && t("shell.footer")}
      </div>
    </aside>
  );
}
