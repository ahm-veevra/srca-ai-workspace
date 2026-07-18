"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Ambulance, Building2, Hospital } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import { type MapIncident, type MapPoint, type MapRegion } from "@/lib/command-center-types";

import { AwaitingData } from "./awaiting-data";
import { ProvenanceButton } from "./provenance-button";

// The Leaflet map touches `window`, so it must load client-side only.
const OpsMap = dynamic(() => import("./ops-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">…</div>
  ),
});

const STATUS_FILL = {
  good: "hsl(var(--success))",
  warn: "hsl(var(--warning))",
  critical: "hsl(var(--danger))",
} as const;

export function SaudiMap({
  regions = [],
  stations = [],
  hospitals = [],
  incidents = [],
}: {
  regions?: MapRegion[];
  stations?: MapPoint[];
  hospitals?: MapPoint[];
  incidents?: MapIncident[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const regionName = React.useCallback(
    (r: MapRegion) => (locale === "ar" ? r.nameAr : r.name),
    [locale],
  );
  const [selected, setSelected] = React.useState<MapRegion | null>(regions[0] ?? null);
  const [focus, setFocus] = React.useState<MapRegion | null>(null);
  const [focusNonce, setFocusNonce] = React.useState(0);
  const focusOn = React.useCallback((r: MapRegion) => {
    setSelected(r);
    setFocus(r);
    setFocusNonce((n) => n + 1);
  }, []);
  const maxCalls = Math.max(...regions.map((r) => r.calls), 1);

  if (regions.length === 0 || !selected) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold">{t("cc.map.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("cc.map.subtitle")}</p>
        </div>
        <AwaitingData label={t("cc.map.awaiting")} hint={t("cc.map.awaitingHint")} />
      </section>
    );
  }

  const labels = {
    station: t("cc.map.station"),
    hospital: t("cc.map.hospital"),
    incident: t("cc.map.incident"),
    calls: t("cc.map.callsToday"),
    active: t("cc.map.active"),
    avgMin: t("cc.map.avgMin"),
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{t("cc.map.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("cc.map.subtitle")}</p>
        </div>
        <ProvenanceButton surfaceKey="map" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Map */}
        <div className="relative h-[440px] overflow-hidden rounded-xl border border-border bg-surface-2">
          <OpsMap
            regions={regions}
            stations={stations}
            hospitals={hospitals}
            incidents={incidents}
            selectedKey={selected.key}
            onSelect={focusOn}
            focus={focus}
            focusNonce={focusNonce}
            regionName={regionName}
            labels={labels}
          />
          {/* Legend */}
          <div className="pointer-events-none absolute bottom-2 left-2 z-[1000] flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-card/85 px-2.5 py-1.5 text-[10px] text-muted-foreground backdrop-blur">
            <span className="inline-flex items-center gap-1"><Ambulance className="h-3 w-3 text-warning" /> {t("cc.map.station")}</span>
            <span className="inline-flex items-center gap-1"><Hospital className="h-3 w-3 text-info" /> {t("cc.map.hospital")}</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-danger" /> {t("cc.map.incident")}</span>
          </div>
        </div>

        {/* Region detail */}
        <div className="flex flex-col rounded-xl border border-border bg-surface-2 p-4">
          <p className="eyebrow text-muted-foreground">{t("cc.map.selectedRegion")}</p>
          <div className="mt-1 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <p className="font-display text-lg font-semibold leading-tight">{locale === "ar" ? selected.nameAr : selected.name}</p>
              <p dir={locale === "ar" ? "ltr" : "rtl"} className="text-xs text-muted-foreground">{locale === "ar" ? selected.name : selected.nameAr}</p>
            </div>
            <span className={cn("ms-auto h-2.5 w-2.5 rounded-full", selected.status === "good" ? "bg-success" : selected.status === "warn" ? "bg-warning" : "bg-danger")} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-card p-3 text-center">
              <p className="font-display text-xl font-bold tabular">{selected.calls}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{t("cc.map.callsToday")}</p>
            </div>
            <div className="rounded-lg bg-card p-3 text-center">
              <p className="font-display text-xl font-bold tabular text-warning">{selected.activeIncidents}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{t("cc.map.active")}</p>
            </div>
            <div className="rounded-lg bg-card p-3 text-center">
              <p className="font-display text-xl font-bold tabular">{selected.avgResponse}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{t("cc.map.avgMin")}</p>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">{t("cc.map.regionsByVolume")}</p>
          <div className="mt-2 space-y-1.5">
            {regions.map((r) => (
              <button key={r.key} onClick={() => focusOn(r)} className="flex w-full items-center gap-2 text-left">
                <span className="w-20 shrink-0 truncate text-xs">{regionName(r)}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full" style={{ width: `${(r.calls / maxCalls) * 100}%`, background: STATUS_FILL[r.status] }} />
                </span>
                <span className="w-8 shrink-0 text-right text-xs tabular text-muted-foreground">{r.calls}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
