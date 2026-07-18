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

// Saudi-Arabia outline traced from the real borders, projected lon/lat → a 100×76 viewBox
// (x = (lon−34.5)/21.2·100, y = (32.2−lat)/16.2·76). Saudi's land borders are largely geometric
// straight lines, so a polygon reproduces them faithfully: the angled northern border, the eastern
// Gulf coast + Qatar base, the south-east Rub-al-Khali corner, the pointed south-west (Jazan), and
// the long Red-Sea coast up the west. Region markers use their true lon/lat, so they land correctly.
const MAP_H = 76;
const KSA_PATH =
  "M2,14 L14,3 L21,1 L35,6 L48,14 L57,15 L62,17 L71,24 L74,27 L74,30 L77,34 L81,36 L83,38 L94,39 L100,48 L98,57 L83,62 L68,64 L59,69 L50,69 L41,69 L39,74 L31,63 L25,57 L22,50 L17,46 L13,38 L9,31 L5,24 L2,20 Z";

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
        <div className="relative aspect-[100/76] self-start overflow-hidden rounded-xl border border-border bg-surface-2">
          <svg viewBox="0 0 100 76" className="absolute inset-0 h-full w-full" role="img" aria-label="Saudi Arabia operations map">
            <defs>
              <linearGradient id="ksa-land" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--surface-3))" />
                <stop offset="100%" stopColor="hsl(var(--muted))" />
              </linearGradient>
              <radialGradient id="ksa-sea" cx="50%" cy="45%" r="70%">
                <stop offset="0%" stopColor="hsl(var(--info))" stopOpacity="0.04" />
                <stop offset="100%" stopColor="hsl(var(--info))" stopOpacity="0.13" />
              </radialGradient>
              <clipPath id="ksa-clip"><path d={KSA_PATH} /></clipPath>
              {layers.heatmap &&
                regions.map((r) => (
                  <radialGradient key={r.key} id={`heat-${r.key}`}>
                    <stop offset="0%" stopColor={STATUS_FILL[r.status]} stopOpacity="0.6" />
                    <stop offset="100%" stopColor={STATUS_FILL[r.status]} stopOpacity="0" />
                  </radialGradient>
                ))}
            </defs>

            {/* Sea backdrop + labels */}
            <rect x="0" y="0" width="100" height="76" fill="url(#ksa-sea)" />
            <text x="4" y="42" transform="rotate(-90 4 42)" textAnchor="middle" fontSize="2.4" fill="hsl(var(--info))" opacity="0.55" className="italic">{t("cc.map.redSea")}</text>
            <text x="90" y="23" transform="rotate(90 90 23)" textAnchor="middle" fontSize="2.4" fill="hsl(var(--info))" opacity="0.55" className="italic">{t("cc.map.gulf")}</text>

            {/* Landmass */}
            <path d={KSA_PATH} fill="url(#ksa-land)" stroke="hsl(var(--border-strong))" strokeWidth="0.7" strokeLinejoin="round" />

            {/* Graticule (clipped to land) */}
            <g clipPath="url(#ksa-clip)" stroke="hsl(var(--border-strong))" strokeWidth="0.15" opacity="0.45">
              {[15, 30, 45, 60].map((gy) => <line key={`h${gy}`} x1="0" y1={gy} x2="100" y2={gy} />)}
              {[25, 45, 65, 85].map((gx) => <line key={`v${gx}`} x1={gx} y1="0" x2={gx} y2={MAP_H} />)}
            </g>

            {/* Heatmap (clipped to land) */}
            {layers.heatmap && (
              <g clipPath="url(#ksa-clip)">
                {regions.map((r) => (
                  <circle key={r.key} cx={r.x} cy={r.y} r={7 + (r.calls / maxCalls) * 13} fill={`url(#heat-${r.key})`} />
                ))}
              </g>
            )}

            {/* Traffic arcs (illustrative) — Riyadh↔Eastern, Riyadh↔Makkah, Makkah↔Asir */}
            {layers.traffic && (
              <g stroke="hsl(var(--warning))" strokeWidth="0.6" strokeDasharray="1.5 1.2" fill="none" opacity="0.7">
                <path d="M58,35 Q66,30 72,28" />
                <path d="M58,35 Q42,42 26,51" />
                <path d="M26,51 Q30,58 38,66" />
              </g>
            )}

            {/* Weather band (illustrative) — south-west highlands */}
            {layers.weather && (
              <g fill="hsl(var(--info))" opacity="0.12">
                <circle cx="35" cy="64" r="12" />
                <circle cx="28" cy="59" r="8" />
              </g>
            )}

            {/* Stations — ambulance bases (amber rounded square with a white ring) */}
            {stations.map((s, i) => (
              <g key={i}>
                <rect x={s.x - 1.5} y={s.y - 1.5} width="3" height="3" rx="0.7" fill="hsl(var(--warning))" stroke="hsl(var(--card))" strokeWidth="0.5" />
                <rect x={s.x - 0.55} y={s.y - 0.55} width="1.1" height="1.1" rx="0.2" fill="hsl(var(--card))" />
                <title>{s.label}</title>
              </g>
            ))}

            {/* Hospitals — medical cross (info-blue disc + white cross) */}
            {hospitals.map((h, i) => (
              <g key={i}>
                <circle cx={h.x} cy={h.y} r="1.7" fill="hsl(var(--info))" stroke="hsl(var(--card))" strokeWidth="0.5" />
                <line x1={h.x - 0.9} y1={h.y} x2={h.x + 0.9} y2={h.y} stroke="hsl(var(--card))" strokeWidth="0.55" strokeLinecap="round" />
                <line x1={h.x} y1={h.y - 0.9} x2={h.x} y2={h.y + 0.9} stroke="hsl(var(--card))" strokeWidth="0.55" strokeLinecap="round" />
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
            {regions.map((r) => {
              const on = selected.key === r.key;
              return (
                <g key={r.key} className="cursor-pointer" onClick={() => setSelected(r)}>
                  {on && (
                    <circle cx={r.x} cy={r.y} r="4" fill="none" stroke={STATUS_FILL[r.status]} strokeWidth="0.5">
                      <animate attributeName="r" values="3;5;3" dur="2.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={r.x} cy={r.y} r={on ? 2.5 : 2} fill={STATUS_FILL[r.status]} stroke="hsl(var(--card))" strokeWidth="0.9" />
                  <text
                    x={r.x}
                    y={r.y - 3.6}
                    textAnchor="middle"
                    fontSize="2.7"
                    fill="hsl(var(--foreground))"
                    className="font-semibold"
                    style={{ paintOrder: "stroke", stroke: "hsl(var(--card))", strokeWidth: 0.9 } as React.CSSProperties}
                  >
                    {regionName(r)}
                  </text>
                </g>
              );
            })}

            {/* Compass */}
            <g transform="translate(94,9)" opacity="0.75">
              <circle r="3" fill="hsl(var(--card))" stroke="hsl(var(--border-strong))" strokeWidth="0.3" />
              <path d="M0,-2 L1,1 L0,0.2 L-1,1 Z" fill="hsl(var(--danger))" />
              <text x="0" y="-3.3" textAnchor="middle" fontSize="2" fill="hsl(var(--muted-foreground))" className="font-semibold">N</text>
            </g>
          </svg>

          {/* Legend */}
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-card/80 px-2.5 py-1.5 text-[10px] text-muted-foreground backdrop-blur">
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
