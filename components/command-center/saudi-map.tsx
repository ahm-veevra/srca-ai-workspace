"use client";

import * as React from "react";
import { Ambulance, Building2, CloudRain, Flame, Hospital, Layers, MapPin, Navigation } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import {
  type MapIncident,
  type MapPoint,
  type MapRegion,
  type Status,
} from "@/lib/command-center-types";

import { AwaitingData } from "./awaiting-data";
import { ProvenanceButton } from "./provenance-button";

// Stylized Arabian-peninsula (KSA) outline over a 0–100 viewBox — illustrative, not geographic.
const KSA_PATH =
  "M30,20 L58,17 Q70,18 78,30 Q82,38 80,45 Q78,52 72,56 Q66,64 58,70 Q52,80 40,84 Q31,82 28,73 Q22,64 21,57 Q17,50 19,42 Q20,33 26,26 Z";

const PRIORITY: Record<"high" | "medium" | "low", string> = {
  high: "hsl(var(--danger))",
  medium: "hsl(var(--warning))",
  low: "hsl(var(--info))",
};
const STATUS_FILL: Record<Status, string> = {
  good: "hsl(var(--success))",
  warn: "hsl(var(--warning))",
  critical: "hsl(var(--danger))",
};

type LayerKey = "heatmap" | "incidents" | "traffic" | "weather";

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
  // Region names ship with an Arabic form (nameAr); use it directly in Arabic mode.
  const regionName = (r: MapRegion) => (locale === "ar" ? r.nameAr : r.name);
  const [selected, setSelected] = React.useState<MapRegion | null>(regions[0] ?? null);
  const [layers, setLayers] = React.useState<Record<LayerKey, boolean>>({
    heatmap: true,
    incidents: true,
    traffic: false,
    weather: false,
  });
  const toggle = (k: LayerKey) => setLayers((s) => ({ ...s, [k]: !s[k] }));
  const maxCalls = Math.max(...regions.map((r) => r.calls));

  const LAYER_META: { key: LayerKey; label: string; icon: typeof Layers }[] = [
    { key: "heatmap", label: t("cc.map.heatmap"), icon: Flame },
    { key: "incidents", label: t("cc.map.incidents"), icon: MapPin },
    { key: "traffic", label: t("cc.map.traffic"), icon: Navigation },
    { key: "weather", label: t("cc.map.weather"), icon: CloudRain },
  ];

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

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{t("cc.map.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("cc.map.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ProvenanceButton surfaceKey="map" />
          {LAYER_META.map((l) => {
            const LIcon = l.icon;
            const on = layers[l.key];
            return (
              <button
                key={l.key}
                onClick={() => toggle(l.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  on ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <LIcon className="h-3.5 w-3.5" /> {l.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Map */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface-2">
          <svg viewBox="0 0 100 100" className="h-full max-h-[420px] w-full" role="img" aria-label="Saudi Arabia operations map">
            <defs>
              {layers.heatmap &&
                regions.map((r) => (
                  <radialGradient key={r.key} id={`heat-${r.key}`}>
                    <stop offset="0%" stopColor={STATUS_FILL[r.status]} stopOpacity="0.55" />
                    <stop offset="100%" stopColor={STATUS_FILL[r.status]} stopOpacity="0" />
                  </radialGradient>
                ))}
            </defs>

            {/* Landmass */}
            <path d={KSA_PATH} fill="hsl(var(--muted))" stroke="hsl(var(--border-strong))" strokeWidth="0.5" />

            {/* Heatmap */}
            {layers.heatmap &&
              regions.map((r) => (
                <circle key={r.key} cx={r.x} cy={r.y} r={6 + (r.calls / maxCalls) * 12} fill={`url(#heat-${r.key})`} />
              ))}

            {/* Traffic arcs (illustrative) */}
            {layers.traffic && (
              <g stroke="hsl(var(--warning))" strokeWidth="0.6" strokeDasharray="1.5 1.2" fill="none" opacity="0.7">
                <path d="M55,46 Q64,40 72,44" />
                <path d="M55,46 Q42,48 30,38" />
                <path d="M28,52 Q25,54 22,55" />
              </g>
            )}

            {/* Weather band (illustrative) */}
            {layers.weather && (
              <g fill="hsl(var(--info))" opacity="0.12">
                <circle cx="30" cy="40" r="14" />
                <circle cx="24" cy="54" r="10" />
              </g>
            )}

            {/* Stations */}
            {stations.map((s, i) => (
              <rect key={i} x={s.x - 0.9} y={s.y - 0.9} width="1.8" height="1.8" rx="0.4" fill="hsl(var(--foreground))" opacity="0.55">
                <title>{s.label}</title>
              </rect>
            ))}

            {/* Hospitals */}
            {hospitals.map((h, i) => (
              <g key={i} stroke="hsl(var(--info))" strokeWidth="0.7">
                <line x1={h.x - 1.1} y1={h.y} x2={h.x + 1.1} y2={h.y} />
                <line x1={h.x} y1={h.y - 1.1} x2={h.x} y2={h.y + 1.1} />
                <title>{h.label}</title>
              </g>
            ))}

            {/* Incidents (pulsing) */}
            {layers.incidents &&
              incidents.map((inc, i) => (
                <g key={i}>
                  <circle cx={inc.x} cy={inc.y} r="1.6" fill={PRIORITY[inc.priority]}>
                    <animate attributeName="r" values="1.4;3;1.4" dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0.15;0.9" dur="2.2s" repeatCount="indefinite" />
                    <title>{inc.label}</title>
                  </circle>
                  <circle cx={inc.x} cy={inc.y} r="1" fill={PRIORITY[inc.priority]} />
                </g>
              ))}

            {/* Region hotspots (clickable) */}
            {regions.map((r) => (
              <g key={r.key} className="cursor-pointer" onClick={() => setSelected(r)}>
                <circle
                  cx={r.x}
                  cy={r.y}
                  r={selected.key === r.key ? 2.8 : 2}
                  fill="hsl(var(--card))"
                  stroke={STATUS_FILL[r.status]}
                  strokeWidth={selected.key === r.key ? 1.1 : 0.8}
                />
                <text x={r.x} y={r.y - 3.4} textAnchor="middle" fontSize="2.6" fill="hsl(var(--foreground))" className="font-medium">
                  {regionName(r)}
                </text>
              </g>
            ))}
          </svg>

          {/* Legend */}
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-card/80 px-2.5 py-1.5 text-[10px] text-muted-foreground backdrop-blur">
            <span className="inline-flex items-center gap-1"><Ambulance className="h-3 w-3" /> {t("cc.map.station")}</span>
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
              <button key={r.key} onClick={() => setSelected(r)} className="flex w-full items-center gap-2 text-left">
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
