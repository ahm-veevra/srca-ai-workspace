import Link from "next/link";
import { ArrowRight, ChevronRight, Database } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/metric";
import { PortalHero } from "@/components/workspace/portal-hero";
import type { Session } from "@/lib/types";
import {
  ANNOUNCEMENTS,
  ANNOUNCEMENT_ICON,
  APP_GROUPS,
  CALLS_24H,
  CALLS_BY_REGION,
  CASE_MIX,
  DEPARTMENT,
  type EnterpriseApp,
  KPIS,
  MY_TASKS,
} from "@/lib/srca-portal";

/** First name without an honorific ("Dr. Sami Al-Dosari" → "Sami"). */
function firstNameOf(full: string): string {
  const parts = full.trim().split(/\s+/);
  const head = parts[0]?.replace(/[.,]$/, "").toLowerCase();
  if ((head === "dr" || head === "mr" || head === "ms" || head === "eng") && parts[1]) return parts[1];
  return parts[0] || full;
}

/** One SRCA application tile — a live, AICP-governed surface. */
function AppTile({ app }: { app: EnterpriseApp }) {
  const Icon = app.icon;
  return (
    <Link href={app.href} className="group block focus-visible:outline-none">
      <Card className="flex h-full items-start gap-3 p-4 transition-colors hover:border-border-strong hover:bg-surface-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-semibold">{app.name}</p>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <p dir="rtl" className="truncate text-[11px] text-muted-foreground/80">{app.nameAr}</p>
          <p className="mt-1 text-xs text-muted-foreground">{app.description}</p>
        </div>
      </Card>
    </Link>
  );
}

/** 24-bar hourly trend (server-rendered). */
function HourlyTrend({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const peak = data.indexOf(max);
  const total = data.reduce((a, b) => a + b, 0);
  const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl font-bold tabular">{total.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">calls · peak {hh(peak)}</span>
      </div>
      <div className="mt-3 flex h-24 items-end gap-[3px]" role="img" aria-label="997 calls per hour over the last 24 hours">
        {data.map((v, i) => (
          <div
            key={i}
            title={`${hh(i)} — ${v} calls`}
            className={`flex-1 rounded-t-sm ${i === peak ? "bg-primary" : "bg-primary/35"}`}
            style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
      </div>
    </div>
  );
}

/** Horizontal bar list for regional call volume. */
function RegionBars() {
  const max = Math.max(...CALLS_BY_REGION.map((r) => r.calls), 1);
  return (
    <div className="space-y-2.5">
      {CALLS_BY_REGION.map((r) => (
        <div key={r.area}>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-medium">{r.area}</span>
            <span className="tabular text-muted-foreground">{r.calls}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(r.calls / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Case & accident mix bars, each in its own chart colour. */
function CaseMixBars() {
  const max = Math.max(...CASE_MIX.map((c) => c.count), 1);
  return (
    <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
      {CASE_MIX.map((c) => (
        <div key={c.label}>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-medium">{c.label}</span>
            <span className="tabular text-muted-foreground">{c.count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${(c.count / max) * 100}%`, background: `hsl(var(${c.colorVar}))` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SrcaPortalHome({ session }: { session: Session }) {
  const first = firstNameOf(session.user.full_name || session.user.email);
  const activeId = session.active_tenant?.id;
  const role =
    session.memberships.find((m) => m.tenant.id === activeId)?.role ||
    (session.user.is_superadmin ? "Superadmin" : "Member");

  return (
    <div className="space-y-8">
      <PortalHero firstName={first} role={role} department={DEPARTMENT.name} />

      {/* Operational snapshot */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            unit={k.unit}
            delta={k.delta}
            goodWhenUp={k.goodWhenUp}
            spark={k.spark}
            icon={k.icon}
            href={k.href}
          />
        ))}
      </section>

      {/* Operational intelligence — from the SRCA data lake, via AICP */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-semibold">Operational intelligence</h2>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Database className="h-3 w-3" /> SRCA data lake · via AICP
          </Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Emergency calls · last 24 hours</CardTitle>
            </CardHeader>
            <CardContent>
              <HourlyTrend data={CALLS_24H} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">997 calls by area · today</CardTitle>
            </CardHeader>
            <CardContent>
              <RegionBars />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Case &amp; accident mix · today</CardTitle>
          </CardHeader>
          <CardContent>
            <CaseMixBars />
          </CardContent>
        </Card>
      </section>

      {/* SRCA applications */}
      <section className="space-y-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Your applications</h2>
          <p className="text-sm text-muted-foreground">
            Everything the First Aid &amp; 997 team needs — each running on the governed AICP platform.
          </p>
        </div>
        {APP_GROUPS.map((group) => (
          <div key={group.key} className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {group.label}
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {group.apps.map((app) => <AppTile key={app.key} app={app} />)}
            </div>
          </div>
        ))}
      </section>

      {/* My tasks + Announcements */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">My tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {MY_TASKS.map((task) => {
              const Icon = task.icon;
              return (
                <Link
                  key={task.title}
                  href={task.href}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{task.meta}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ANNOUNCEMENT_ICON className="h-4 w-4 text-primary" /> Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {ANNOUNCEMENTS.map((a) => (
              <div key={a.title} className="flex items-start gap-3 rounded-lg px-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{a.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.when}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px]">{a.tag}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Transparency */}
      <p className="flex items-center justify-center gap-2 border-t border-border pt-4 text-center text-xs text-muted-foreground">
        <Database className="h-3.5 w-3.5" />
        Every figure and answer is served by AICP from governed SRCA data — sovereign, audited and access-controlled.
      </p>
    </div>
  );
}
