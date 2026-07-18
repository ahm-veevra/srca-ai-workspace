"use client";

import * as React from "react";
import {
  Activity,
  Ambulance,
  Building2,
  Clock,
  Flame,
  Loader2,
  MapPin,
  PhoneCall,
  Sparkles,
  TrendingUp,
  Wrench,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DEFAULT_CONFIDENCE,
  STATUS_SOFT,
  STATUS_TEXT,
  type AmbulanceDemand,
  type CrewFatigue,
  type FleetMaint,
  type Forecast,
  type HospitalCap,
  type Hotspot,
  type ResponsePrediction,
  type Status,
} from "@/lib/command-center-types";
import { useLocale, useT, type MessageKey } from "@/lib/i18n";
import { regenerateForecast } from "@/lib/command-center-assist";
import { dl } from "@/lib/command-center-labels";
import { cn } from "@/lib/utils";

import { AwaitingData } from "./awaiting-data";
import { ProvenanceButton } from "./provenance-button";

/* ── shared building blocks ────────────────────────────────────────────────── */

/** Small confidence pill — success-toned, sits in each widget's header. */
function ConfidenceChip({ value, className }: { value: number; className?: string }) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success",
        className,
      )}
    >
      <Sparkles className="h-3 w-3" />
      {t("cc.pred.confidence", { n: value })}
    </span>
  );
}

function WidgetCard({
  icon: Icon,
  title,
  confidence,
  provKey,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  confidence?: number;
  provKey?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-4 rounded-2xl p-5 shadow-sm transition-all hover:border-border-strong",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {confidence != null ? <ConfidenceChip value={confidence} /> : null}
          {provKey ? <ProvenanceButton surfaceKey={provKey} /> : null}
        </div>
      </div>
      {children}
    </Card>
  );
}

/** Thin token-driven progress bar. */
function Meter({
  value,
  colorVar = "--primary",
  className,
}: {
  value: number;
  colorVar?: string;
  className?: string;
}) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          backgroundColor: `hsl(var(${colorVar}))`,
        }}
      />
    </div>
  );
}

/* ── 1. Emergency Call Forecast ────────────────────────────────────────────── */

function CallForecastWidget({
  forecast = [],
  loading = false,
}: {
  forecast?: Forecast[];
  loading?: boolean;
}) {
  const t = useT();
  const avg = forecast.length
    ? Math.round(forecast.reduce((s, f) => s + f.confidence, 0) / forecast.length)
    : 0;
  if (forecast.length === 0) {
    return (
      <WidgetCard icon={PhoneCall} title={t("cc.pred.callForecast")} provKey="call_forecast">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            {t("cc.summary.generating")}
          </div>
        ) : (
          <AwaitingData compact label={t("cc.pred.awaitingSmall")} hint="" />
        )}
      </WidgetCard>
    );
  }
  return (
    <WidgetCard icon={PhoneCall} title={t("cc.pred.callForecast")} provKey="call_forecast" confidence={avg}>
      <div className="grid grid-cols-2 gap-3">
        {forecast.map((f: Forecast) => (
          <div
            key={f.label}
            className="rounded-xl bg-surface-2 p-3 transition-colors hover:bg-muted"
          >
            <p className="eyebrow">{dl(t, f.label)}</p>
            <p className="tabular mt-1 text-2xl font-semibold leading-none text-foreground">
              {f.value}
            </p>
            <p className="tabular mt-2 text-[11px] text-muted-foreground">
              {t("cc.pred.confidence", { n: f.confidence })}
            </p>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

/* ── 2. Response Time Prediction ───────────────────────────────────────────── */

function ResponsePredictionWidget({
  prediction = null,
}: {
  prediction?: ResponsePrediction | null;
}) {
  const t = useT();
  if (!prediction) {
    return (
      <WidgetCard icon={Clock} title={t("cc.pred.responsePrediction")} provKey="response_prediction">
        <AwaitingData compact label={t("cc.pred.awaitingSmall")} hint="" />
      </WidgetCard>
    );
  }
  const data = prediction.labels.map((label, i) => ({
    label,
    value: prediction.series[i],
  }));
  return (
    <WidgetCard
      icon={Clock}
      title={t("cc.pred.responsePrediction")} provKey="response_prediction"
      confidence={prediction.confidence}
    >
      <div>
        <p className="text-lg font-semibold text-foreground">
          {prediction.headline}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {prediction.explanation}
        </p>
      </div>
      <div className="h-28 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="respFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide domain={["dataMin - 0.4", "dataMax + 0.4"]} />
            <Tooltip
              cursor={{ stroke: "hsl(var(--border-strong))", strokeWidth: 1 }}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                fontSize: 12,
                color: "hsl(var(--foreground))",
                boxShadow: "0 4px 16px -4px rgba(0,0,0,0.25)",
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              formatter={(v: number) => [`${v} min`, t("cc.pred.predictedTip")]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#respFill)"
              dot={{ r: 2.5, fill: "hsl(var(--primary))", strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  );
}

/* ── 3. Predicted Emergency Hotspots ───────────────────────────────────────── */

const LEVEL_LABEL = {
  good: "cc.risk.low",
  warn: "cc.risk.elevated",
  critical: "cc.risk.critical",
} as const satisfies Record<Status, MessageKey>;

function HotspotsWidget({ hotspots = [] }: { hotspots?: Hotspot[] }) {
  const t = useT();
  return (
    <WidgetCard icon={MapPin} title={t("cc.pred.hotspots")} provKey="hotspots">
      <ul className="flex flex-col gap-3">
        {hotspots.map((h: Hotspot) => (
          <li
            key={h.area}
            className="rounded-xl bg-surface-2 p-3 transition-colors hover:bg-muted"
          >
            <div className="flex items-center justify-between gap-2">
              <span className={cn("text-sm font-medium", STATUS_TEXT[h.level])}>
                {h.area}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  STATUS_SOFT[h.level],
                )}
              >
                <Flame className="h-3 w-3" />
                {t(LEVEL_LABEL[h.level])}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {h.factors.map((factor) => (
                <span
                  key={factor}
                  className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {factor}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

/* ── 4. Ambulance Demand Forecast ──────────────────────────────────────────── */

function DemandWidget({ demand = null }: { demand?: AmbulanceDemand | null }) {
  const t = useT();
  if (!demand) {
    return (
      <WidgetCard icon={Ambulance} title={t("cc.pred.demand")} provKey="ambulance_demand">
        <AwaitingData compact label={t("cc.pred.awaitingSmall")} hint="" />
      </WidgetCard>
    );
  }
  const figures: { label: string; value: number; colorVar: string }[] = [
    { label: t("cc.pred.current"), value: demand.current, colorVar: "--muted-foreground" },
    { label: t("cc.pred.predictedPeak"), value: demand.predictedPeak, colorVar: "--warning" },
    { label: t("cc.pred.weekend"), value: demand.weekend, colorVar: "--chart-5" },
    { label: t("cc.pred.holiday"), value: demand.holiday, colorVar: "--danger" },
  ];
  return (
    <WidgetCard icon={Ambulance} title={t("cc.pred.demand")} provKey="ambulance_demand" confidence={85}>
      <div className="grid grid-cols-2 gap-3">
        {figures.map((f) => (
          <div key={f.label} className="rounded-xl bg-surface-2 p-3">
            <div className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: `hsl(var(${f.colorVar}))` }}
              />
              <p className="eyebrow">{f.label}</p>
            </div>
            <p
              className="tabular mt-1 text-2xl font-semibold leading-none"
              style={{ color: `hsl(var(${f.colorVar}))` }}
            >
              {f.value.toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">{t("cc.pred.unitsPerDay")}</p>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

/* ── 5. Hospital Capacity Forecast ─────────────────────────────────────────── */

function HospitalCapacityWidget({
  capacity = [],
}: {
  capacity?: HospitalCap[];
}) {
  const t = useT();
  return (
    <WidgetCard icon={Building2} title={t("cc.pred.hospitalCapacity")} provKey="hospital_capacity" confidence={87}>
      <ul className="flex flex-col gap-3.5">
        {capacity.map((h: HospitalCap) => {
          const critical = h.predicted >= 90;
          return (
            <li key={h.name} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {h.name}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  {critical ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                      <Activity className="h-3 w-3" />
                      {t("cc.pred.overloadRisk")}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "tabular text-sm font-semibold",
                      critical ? "text-danger" : "text-foreground",
                    )}
                  >
                    {h.predicted}%
                  </span>
                </div>
              </div>
              {/* Track showing occupancy (solid) growing to predicted (translucent). */}
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, h.predicted)}%`,
                    backgroundColor: critical
                      ? "hsl(var(--danger) / 0.35)"
                      : "hsl(var(--warning) / 0.35)",
                  }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, h.occupancy)}%`,
                    backgroundColor: critical
                      ? "hsl(var(--danger))"
                      : "hsl(var(--primary))",
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="tabular">{t("cc.pred.now", { n: h.occupancy })}</span>
                <span className="tabular">{t("cc.pred.predictedPct", { n: h.predicted })}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}

/* ── 6. Fleet Maintenance Prediction ───────────────────────────────────────── */

function FleetMaintenanceWidget({
  maintenance = [],
}: {
  maintenance?: FleetMaint[];
}) {
  const t = useT();
  return (
    <WidgetCard icon={Wrench} title={t("cc.pred.fleetMaintenance")} provKey="fleet_maintenance" confidence={83}>
      <ul className="flex flex-col gap-3.5">
        {maintenance.map((m: FleetMaint) => {
          const pct = Math.round(m.prob * 100);
          const urgent = pct >= 75;
          return (
            <li key={m.unit} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{m.unit}</p>
                  <p className="text-xs text-muted-foreground">{m.issue}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "tabular text-sm font-semibold",
                      urgent ? "text-danger" : "text-warning",
                    )}
                  >
                    {pct}%
                  </p>
                  <p className="tabular text-[10px] text-muted-foreground">
                    {t("cc.pred.dueIn", { h: m.dueHours })}
                  </p>
                </div>
              </div>
              <Meter value={pct} colorVar={urgent ? "--danger" : "--warning"} />
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}

/* ── 7. Crew Fatigue Prediction ────────────────────────────────────────────── */

function riskToPct(risk: string): number {
  switch (risk.toLowerCase()) {
    case "high":
      return 82;
    case "medium":
      return 55;
    case "low":
      return 28;
    default:
      return 50;
  }
}

function riskColor(pct: number): string {
  if (pct >= 70) return "--danger";
  if (pct >= 45) return "--warning";
  return "--success";
}

function CrewFatigueWidget({ fatigue = null }: { fatigue?: CrewFatigue | null }) {
  const t = useT();
  if (!fatigue) {
    return (
      <WidgetCard icon={Activity} title={t("cc.pred.crewFatigue")} provKey="crew_fatigue">
        <AwaitingData compact label={t("cc.pred.awaitingSmall")} hint="" />
      </WidgetCard>
    );
  }
  const shortagePct = riskToPct(fatigue.shortageRisk);
  const gauges: { label: string; display: string; pct: number }[] = [
    { label: t("cc.pred.shortageRisk"), display: fatigue.shortageRisk, pct: shortagePct },
    { label: t("cc.pred.overtimeRisk"), display: `${fatigue.overtimeRisk}%`, pct: fatigue.overtimeRisk },
    { label: t("cc.pred.fatigueIndex"), display: `${fatigue.fatigueIndex}%`, pct: fatigue.fatigueIndex },
  ];
  return (
    <WidgetCard icon={Activity} title={t("cc.pred.crewFatigue")} provKey="crew_fatigue" confidence={86}>
      <div className="flex flex-col gap-3">
        {gauges.map((g) => {
          const colorVar = riskColor(g.pct);
          return (
            <div key={g.label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{g.label}</span>
                <span
                  className="tabular text-sm font-semibold"
                  style={{ color: `hsl(var(${colorVar}))` }}
                >
                  {g.display}
                </span>
              </div>
              <Meter value={g.pct} colorVar={colorVar} />
            </div>
          );
        })}
      </div>
      <div className="rounded-xl border border-warning/30 bg-warning/10 p-3">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-warning" />
          <p className="eyebrow text-warning">{t("cc.pred.recommendedAction")}</p>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-foreground">
          {fatigue.recommendation}
        </p>
      </div>
    </WidgetCard>
  );
}

/* ── section ───────────────────────────────────────────────────────────────── */

export function PredictiveAnalytics({
  forecast = [],
  forecastCapabilityId,
  responsePrediction = null,
  hotspots = [],
  ambulanceDemand = null,
  hospitalCapacity = [],
  fleetMaintenance = [],
  crewFatigue = null,
}: {
  forecast?: Forecast[];
  forecastCapabilityId?: string;
  responsePrediction?: ResponsePrediction | null;
  hotspots?: Hotspot[];
  ambulanceDemand?: AmbulanceDemand | null;
  hospitalCapacity?: HospitalCap[];
  fleetMaintenance?: FleetMaint[];
  crewFatigue?: CrewFatigue | null;
}) {
  const t = useT();
  const { locale } = useLocale();

  // The call forecast is generated CLIENT-SIDE (SSR no longer waits on the model) — load it on
  // mount with a spinner, so a slow/failing model never blocks or empties this widget.
  const [fc, setFc] = React.useState<Forecast[]>(forecast);
  const [fcBusy, setFcBusy] = React.useState(false);
  React.useEffect(() => {
    if (fc.length === 0 && forecastCapabilityId) {
      setFcBusy(true);
      void (async () => {
        try {
          const result = await regenerateForecast(forecastCapabilityId, locale);
          if (result) setFc(result);
        } finally {
          setFcBusy(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const empty =
    forecast.length === 0 &&
    !responsePrediction &&
    hotspots.length === 0 &&
    !ambulanceDemand &&
    hospitalCapacity.length === 0 &&
    fleetMaintenance.length === 0 &&
    !crewFatigue;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-lg font-semibold">{t("cc.pred.title")}</h2>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              {t("cc.pred.badge")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("cc.pred.desc")}
          </p>
        </div>
        <p className="eyebrow shrink-0">{t("cc.pred.horizon", { h: DEFAULT_CONFIDENCE.horizon })}</p>
      </div>

      {empty ? (
        <AwaitingData label={t("cc.pred.awaiting")} hint={t("cc.pred.awaitingHint")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CallForecastWidget forecast={fc} loading={fcBusy} />
          <ResponsePredictionWidget prediction={responsePrediction} />
          <HotspotsWidget hotspots={hotspots} />
          <DemandWidget demand={ambulanceDemand} />
          <HospitalCapacityWidget capacity={hospitalCapacity} />
          <FleetMaintenanceWidget maintenance={fleetMaintenance} />
          <CrewFatigueWidget fatigue={crewFatigue} />
        </div>
      )}
    </section>
  );
}
