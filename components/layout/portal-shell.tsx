"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, LogOut, Search, ShieldCheck } from "lucide-react";
import * as React from "react";

import { apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { hasPerm, type Session } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { usePathLabel } from "@/lib/i18n/nav"; // localized labelForPath
import { Sidebar } from "./sidebar";
import { CommandPalette } from "./command-palette";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";
import { Notifications } from "./notifications";
import { HealthPill } from "./health-pill";
import { AskAssistant } from "./ask-assistant";
import {
  EnvSelector,
  TenantSelector,
  ENVIRONMENTS,
  type EnvKey,
} from "./tenant-env";

export function PortalShell({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const pathLabel = usePathLabel(pathname);
  const [collapsed, setCollapsed] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [env, setEnv] = React.useState<EnvKey>("prod");

  // Restore persisted UI prefs.
  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("veevra-nav-collapsed") === "1");
      const e = localStorage.getItem("veevra-env") as EnvKey | null;
      if (e) setEnv(e);
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("veevra-nav-collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  function changeEnv(e: EnvKey) {
    setEnv(e);
    try {
      localStorage.setItem("veevra-env", e);
    } catch {}
  }

  // Global ⌘K / Ctrl+K to open the command palette.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function logout() {
    try {
      await apiPost("/auth/logout");
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const canObservability = hasPerm(session.permissions, "observability.read");
  const canGovernance = hasPerm(session.permissions, "governance.read");
  const envMeta = ENVIRONMENTS.find((e) => e.key === env) ?? ENVIRONMENTS[0];
  const initials = session.user.email.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar session={session} collapsed={collapsed} onToggle={toggleCollapsed} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Non-prod environment strip */}
        {env !== "prod" && (
          <div
            className={cn(
              "flex h-6 items-center justify-center text-[11px] font-semibold uppercase tracking-[0.14em] text-background",
              envMeta.tone,
            )}
          >
            {envMeta.label} {t("shell.envSuffix")}
          </div>
        )}

        {/* Header */}
        <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-surface-2/80 px-5 backdrop-blur">
          {/* Breadcrumb */}
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">SRCA AI Workspace</span>
            <span className="hidden text-muted-foreground/50 sm:inline">/</span>
            <span className="truncate font-semibold">{pathLabel}</span>
          </div>

          {/* Search */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="group hidden h-9 max-w-sm flex-1 items-center gap-2 rounded-md border border-border bg-[hsl(var(--input))] px-3 text-sm text-muted-foreground transition-colors hover:border-border-strong md:flex"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-start">{t("shell.search")}</span>
            <kbd className="rounded border border-border bg-surface-3 px-1.5 py-0.5 text-[10px]">
              ⌘K
            </kbd>
          </button>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              aria-label={t("shell.searchAria")}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground md:hidden"
            >
              <Search className="h-4 w-4" />
            </button>
            <EnvSelector value={env} onChange={changeEnv} />
            <TenantSelector
              activeTenant={session.active_tenant}
              memberships={session.memberships}
              isSuperadmin={session.user.is_superadmin}
            />
            <div className="hidden h-5 w-px bg-border lg:block" />
            <AskAssistant />
            <HealthPill canRead={canObservability} />
            <Notifications canRead={canGovernance} />
            <LanguageToggle />
            <ThemeToggle />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-md py-1 ps-1 pe-1.5 transition-colors hover:bg-surface-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                  {initials}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute end-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border-strong bg-surface-2 shadow-elevated">
                    <div className="border-b border-border px-4 py-3">
                      <p className="truncate text-sm font-medium">{session.user.email}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        {session.user.is_superadmin
                          ? t("shell.role.superadmin")
                          : t("shell.role.member")}
                        {session.user.mfa_enabled && (
                          <>
                            <span>·</span>
                            <ShieldCheck className="h-3 w-3 text-success" /> {t("shell.mfa")}
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-surface-3"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("shell.signOut")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        permissions={session.permissions}
      />
    </div>
  );
}
