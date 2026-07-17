import Link from "next/link";
import { ArrowRight, ExternalLink, LayoutGrid, Lock, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Onboarding } from "@/components/workspace/onboarding";
import { aicpHref, isAicpRoute } from "@/lib/aicp";
import {
  CENTERS, PERSONAS_SUPPORTED, QUICK_ACTIONS, type Center, type QuickAction,
} from "@/lib/workspace";
import { PLATFORM_ICON, SUITES, suiteForCenter, type Suite } from "@/lib/suites";

function ActionCard({ a }: { a: QuickAction }) {
  const Icon = a.icon;
  const external = isAicpRoute(a.href);
  const inner = (
    <Card className="group flex h-full items-start gap-3 p-4 transition-colors hover:border-border-strong hover:bg-muted/30">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-sm font-semibold">
          {a.label}
          {external
            ? <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            : <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />}
        </p>
        <p className="text-xs text-muted-foreground">{a.description}</p>
      </div>
    </Card>
  );
  return external
    ? <a href={aicpHref(a.href)}>{inner}</a>
    : <Link href={a.href}>{inner}</Link>;
}

function CenterCard({ c }: { c: Center }) {
  const Icon = c.icon;
  const live = c.status === "live";
  const external = c.href ? isAicpRoute(c.href) : false;
  const suite = suiteForCenter(c.key);
  const inner = (
    <Card className={`flex h-full flex-col ${live ? "transition-colors hover:border-border-strong" : "opacity-80"}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4 text-primary" /> {c.name}
          </CardTitle>
          {live
            ? <Badge variant="success" className="text-[10px]">Live</Badge>
            : <Badge variant="secondary" className="gap-1 text-[10px]"><Lock className="h-3 w-3" /> Roadmap</Badge>}
        </div>
        {suite && (
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            <span style={{ color: suite.accent }}>{suite.name}</span> · {suite.domain}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">
        <p className="text-sm text-muted-foreground">{c.purpose}</p>
        <div className="flex flex-wrap gap-1">
          {c.capabilities.slice(0, 4).map((cap) => (
            <span key={cap} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {cap}
            </span>
          ))}
        </div>
        {live && (
          <div className="mt-auto flex items-center gap-1 pt-2 text-sm text-primary">
            Open {external ? <ExternalLink className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
          </div>
        )}
      </CardContent>
    </Card>
  );
  if (!live || !c.href) return inner;
  return external
    ? <a href={aicpHref(c.href)}>{inner}</a>
    : <Link href={c.href}>{inner}</Link>;
}

const CENTER_BY_KEY: Record<string, Center> = Object.fromEntries(
  CENTERS.map((c) => [c.key, c]),
);

/** A suite and its live Centers — "products appear as capabilities of the suite". */
function SuiteBlock({ suite }: { suite: Suite }) {
  const Icon = suite.icon;
  const centers = suite.centers
    .map((k) => CENTER_BY_KEY[k])
    .filter((c): c is Center => !!c && c.status === "live");
  if (centers.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${suite.accent}1a`, color: suite.accent }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold">
            {suite.name}{" "}
            <span className="text-sm font-normal text-muted-foreground">· {suite.domain}</span>
          </p>
          <p className="text-sm text-muted-foreground">{suite.tagline}</p>
        </div>
        <Badge variant="outline" className="ms-auto shrink-0 text-[10px]">Built on AICP</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {centers.map((c) => <CenterCard key={c.key} c={c} />)}
      </div>
    </div>
  );
}

export function WorkspaceHome() {
  const roadmap = CENTERS.filter((c) => c.status === "roadmap");
  // Cross-cutting platform Centers that belong to no single suite (shared AICP surface).
  const platform = CENTERS.filter(
    (c) => c.status === "live" && !suiteForCenter(c.key),
  );

  return (
    <div className="space-y-8">
      {/* Role-based first-run onboarding (dismissible; persists the chosen role). */}
      <Onboarding />

      {/* Business-action launcher */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          What would you like to do today?
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {QUICK_ACTIONS.map((a) => <ActionCard key={a.label} a={a} />)}
        </div>
      </section>

      {/* Enterprise Suites — the business-application tier over AICP. */}
      <section className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold">Enterprise Suites</h2>
            <Badge variant="outline">{SUITES.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Five business applications on one secure enterprise AI platform. The intelligence is
            centrally governed, audited and shared across every suite.
          </p>
        </div>
        {SUITES.map((s) => <SuiteBlock key={s.key} suite={s} />)}

        {platform.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <PLATFORM_ICON className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-base font-semibold">
                  Platform{" "}
                  <span className="text-sm font-normal text-muted-foreground">· Shared AICP surface</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Cross-cutting tools every suite draws on.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {platform.map((c) => <CenterCard key={c.key} c={c} />)}
            </div>
          </div>
        )}
      </section>

      {roadmap.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold">On the roadmap</h2>
            <Badge variant="secondary">{roadmap.length}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roadmap.map((c) => <CenterCard key={c.key} c={c} />)}
          </div>
        </section>
      )}

      <section>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" /> Built for every role
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {PERSONAS_SUPPORTED.map((p) => (
              <span key={p} className="rounded-full border border-border bg-surface-1 px-2.5 py-0.5 text-xs">
                {p}
              </span>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Link href="/capabilities">
          <Card className="transition-colors hover:border-border-strong">
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-3">
                <LayoutGrid className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">AI Capability Marketplace</p>
                  <p className="text-sm text-muted-foreground">
                    Every AI capability, its business value, and where to try it.
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-primary" />
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}
