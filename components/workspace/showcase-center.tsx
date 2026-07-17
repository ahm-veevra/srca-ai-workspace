"use client";

import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Boxes, CheckCircle2, Layers, Network, Play, Sparkles, TrendingUp,
  Workflow,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SHOWCASES, showcaseUseCase, type Showcase } from "@/lib/showcase";

export function ShowcaseCenter() {
  const [selected, setSelected] = React.useState<Showcase | null>(null);
  if (selected) return <ShowcaseDetail s={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {SHOWCASES.map((s) => (
        <Card key={s.key} className="flex h-full cursor-pointer flex-col transition-colors hover:border-border-strong"
          onClick={() => setSelected(s)}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> {s.title}</CardTitle>
              <Badge variant="outline" className="text-[10px]">{s.sector}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-2">
            <p className="text-sm text-muted-foreground">{s.problem}</p>
            <div className="mt-auto flex items-center gap-1 pt-2 text-sm text-primary">
              See the story <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Chain({ steps, icon: Icon }: { steps: string[]; icon: typeof Workflow }) {
  return (
    <div className="flex flex-wrap items-center gap-y-2">
      {steps.map((st, i) => (
        <div key={i} className="flex items-center">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2/50 px-2.5 py-1 text-xs">
            <Icon className="h-3.5 w-3.5 text-primary" /> {st}
          </span>
          {i < steps.length - 1 && <ArrowRight className="mx-1 h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

function ShowcaseDetail({ s, onBack }: { s: Showcase; onBack: () => void }) {
  const uc = showcaseUseCase(s);
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary">
        <ArrowLeft className="h-4 w-4" /> All scenarios
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">{s.title}</h2>
          <Badge variant="outline" className="mt-1">{s.sector}</Badge>
        </div>
        <Link href={s.href}>
          <Button><Play className="h-4 w-4" /> Launch this solution</Button>
        </Link>
      </div>

      {/* Problem / Solution */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-danger">The problem</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{s.problem}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-success">The solution</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{s.solution}</p></CardContent>
        </Card>
      </div>

      {/* Before / After */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Before &amp; after</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Before</p>
            <p className="text-sm">{s.before}</p>
          </div>
          <div className="rounded-lg border border-success/30 bg-success/[0.04] p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-success">After — with AICP</p>
            <p className="text-sm">{s.after}</p>
          </div>
        </CardContent>
      </Card>

      {/* Processing steps + AICP components */}
      {uc && (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Workflow className="h-4 w-4 text-primary" /> Processing steps</CardTitle></CardHeader>
            <CardContent><Chain steps={uc.technicalView} icon={Workflow} /></CardContent>
          </Card>
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Network className="h-4 w-4 text-primary" /> AICP services</CardTitle></CardHeader>
              <CardContent><Chain steps={uc.architectureView} icon={Network} /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Layers className="h-4 w-4 text-primary" /> AICP components</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {uc.configuration.map((c) => (
                  <span key={c.label} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 px-2 py-0.5 text-xs">
                    <Boxes className="h-3 w-3 text-primary" /> {c.label}
                  </span>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Business value */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4 text-success" /> Business value</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {s.businessValue.map((v) => (
              <li key={v} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {v}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div>
        <Link href={s.href}><Button><Play className="h-4 w-4" /> Launch this solution</Button></Link>
      </div>
    </div>
  );
}
