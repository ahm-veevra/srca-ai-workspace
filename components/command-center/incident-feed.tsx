"use client";

import { Ambulance, Clock, MapPin, Radio } from "lucide-react";

import { type Incident } from "@/lib/command-center-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

import { AwaitingData } from "./awaiting-data";
import { ProvenanceButton } from "./provenance-button";

const MAX_VISIBLE = 8;

/** High → danger, Medium → warning, Low → muted. */
const PRIORITY_PILL: Record<Incident["priority"], string> = {
  High: "bg-danger/15 text-danger",
  Medium: "bg-warning/15 text-warning",
  Low: "bg-muted text-muted-foreground",
};

function IncidentRow({ inc }: { inc: Incident }) {
  return (
    <li className="animate-in fade-in slide-in-from-top-2 duration-500 fill-mode-both">
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface-2 px-3 py-2.5 transition-colors hover:border-border-strong">
        <span className="tabular mt-0.5 w-12 shrink-0 text-xs font-medium text-muted-foreground">
          {inc.time}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {inc.type}
            </span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                PRIORITY_PILL[inc.priority],
              )}
            >
              {inc.priority}
            </span>
          </div>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{inc.location}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Ambulance className="h-3 w-3 shrink-0" aria-hidden />
              {inc.ambulance}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" aria-hidden />
              <span className="tabular">{inc.eta}</span>
            </span>
          </div>
        </div>
        <Badge variant="outline" className="mt-0.5 shrink-0 whitespace-nowrap">
          {inc.status}
        </Badge>
      </div>
    </li>
  );
}

export function IncidentFeed({ feed = [] }: { feed?: Incident[] }) {
  const t = useT();
  const incidents = feed.slice(0, MAX_VISIBLE);

  return (
    <Card className="rounded-2xl p-5 shadow-sm transition-all">
      <CardHeader className="flex flex-row items-center justify-between border-0 p-0 pb-4">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="font-display text-lg font-semibold">
            {t("cc.incidents.title")}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-danger">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
            </span>
            {t("cc.incidents.live")}
          </span>
          <ProvenanceButton surfaceKey="incident_feed" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {incidents.length === 0 ? (
          <AwaitingData label={t("cc.incidents.awaiting")} />
        ) : (
          <ul className="space-y-2">
            {incidents.map((inc) => (
              <IncidentRow key={inc.id} inc={inc} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
