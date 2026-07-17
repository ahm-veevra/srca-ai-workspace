"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  type ColoredSlice,
  type LabeledValue,
  type UtilMetric,
} from "@/lib/command-center-types";

import { AwaitingData } from "./awaiting-data";
import { ProvenanceButton } from "./provenance-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import { dl } from "@/lib/command-center-labels";
import { cn } from "@/lib/utils";

/* ── shared token colours ──────────────────────────────────────────────────── */
const PRIMARY = "hsl(var(--primary))";
const MUTED = "hsl(var(--muted-foreground))";
const GRID = "hsl(var(--border))";
const cvar = (v: string) => `hsl(var(${v}))`;

/* ── tidy, token-styled tooltip ────────────────────────────────────────────── */
function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-border-strong bg-surface-2 px-2.5 py-1.5 text-xs shadow-elevated">
      {label !== undefined && label !== "" && (
        <p className="mb-0.5 font-medium text-foreground">{label}</p>
      )}
      <p className="flex items-center gap-1.5 text-muted-foreground">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: p.color ?? PRIMARY }}
        />
        <span className="tabular text-foreground">{p.value}</span>
        {unit ? <span>{unit}</span> : null}
      </p>
    </div>
  );
}

/* ── small reusable card wrapper ───────────────────────────────────────────── */
function ChartCard({
  title,
  eyebrow,
  provKey,
  children,
  className,
}: {
  title: string;
  eyebrow?: string;
  provKey?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "rounded-2xl p-5 shadow-sm transition-all hover:border-border-strong",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between border-0 p-0 pb-3">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <CardTitle>{title}</CardTitle>
        </div>
        {provKey ? <ProvenanceButton surfaceKey={provKey} /> : null}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

/* ── 1. Emergency Types — donut ────────────────────────────────────────────── */
function EmergencyTypesCard({ items = [] }: { items?: ColoredSlice[] }) {
  const t = useT();
  const total = React.useMemo(
    () => items.reduce((sum, d) => sum + d.value, 0),
    [items],
  );
  return (
    <ChartCard eyebrow={t("cc.ops.caseMix")} title={t("cc.ops.emergencyTypes")} provKey="emergency_type_mix">
      <div className="flex items-center gap-4">
        <div className="relative h-[180px] w-[180px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={items}
                dataKey="value"
                nameKey="label"
                innerRadius={54}
                outerRadius={80}
                paddingAngle={2}
                stroke="hsl(var(--card))"
                strokeWidth={2}
                isAnimationActive
              >
                {items.map((d) => (
                  <Cell key={d.label} fill={cvar(d.colorVar)} />
                ))}
              </Pie>
              <Tooltip
                cursor={false}
                content={<ChartTooltip unit="calls" />}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="tabular text-2xl font-semibold text-foreground">
              {total.toLocaleString()}
            </span>
            <span className="eyebrow">{t("cc.total")}</span>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5">
          {items.map((d) => (
            <li
              key={d.label}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: cvar(d.colorVar) }}
              />
              <span className="flex-1 truncate text-foreground">{dl(t, d.label)}</span>
              <span className="tabular font-medium text-foreground">
                {d.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}

/* ── 2. Response Time Trend — area ─────────────────────────────────────────── */
function ResponseTrendCard({ trend = [] }: { trend?: number[] }) {
  const t = useT();
  const data = React.useMemo(
    () => trend.map((v, i) => ({ i: `T-${trend.length - i}`, v })),
    [trend],
  );
  const latest = trend[trend.length - 1];
  return (
    <ChartCard eyebrow={t("cc.ops.last8")} title={t("cc.ops.responseTrend")} provKey="response_trend">
      <div className="mb-1 flex items-end justify-between">
        <span className="tabular text-2xl font-semibold text-foreground">
          {latest}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            min
          </span>
        </span>
      </div>
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="respFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.28} />
                <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="i"
              tick={{ fontSize: 11, fill: MUTED }}
              tickLine={false}
              axisLine={false}
              interval={1}
            />
            <YAxis hide domain={["dataMin - 0.4", "dataMax + 0.4"]} />
            <Tooltip cursor={false} content={<ChartTooltip unit="min" />} />
            <Area
              type="monotone"
              dataKey="v"
              stroke={PRIMARY}
              strokeWidth={2.5}
              fill="url(#respFill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ── 3. Calls by Hour — 24 bars, peak highlighted ──────────────────────────── */
function CallsByHourCard({ byHour = [] }: { byHour?: number[] }) {
  const t = useT();
  const peak = React.useMemo(
    () => byHour.indexOf(Math.max(...byHour)),
    [byHour],
  );
  const data = React.useMemo(
    () =>
      byHour.map((v, h) => ({
        hour: `${String(h).padStart(2, "0")}:00`,
        calls: v,
        peak: h === peak,
      })),
    [peak],
  );
  return (
    <ChartCard eyebrow={t("cc.ops.dist24")} title={t("cc.ops.callsByHour")} provKey="calls_by_hour">
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10, fill: MUTED }}
              tickLine={false}
              axisLine={false}
              interval={3}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              content={<ChartTooltip unit="calls" />}
            />
            <Bar dataKey="calls" radius={[3, 3, 0, 0]} isAnimationActive>
              {data.map((d) => (
                <Cell
                  key={d.hour}
                  fill={d.peak ? PRIMARY : "hsl(var(--muted-foreground) / 0.35)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ── 4. Calls by Region — horizontal bars ──────────────────────────────────── */
function CallsByRegionCard({ byRegion = [] }: { byRegion?: LabeledValue[] }) {
  const t = useT();
  const data = React.useMemo(
    () =>
      [...byRegion]
        .sort((a, b) => b.value - a.value)
        .map((r) => ({ ...r, label: dl(t, r.label) })),
    [byRegion, t],
  );
  const max = data.length ? data[0].value : 0;
  return (
    <ChartCard eyebrow={t("cc.ops.regionalLoad")} title={t("cc.ops.callsByRegion")} provKey="calls_by_region">
      {/* HTML bar list (not recharts) — logical layout mirrors cleanly for RTL: label on the
          start side, bar fills from the start edge, value on the end side. No label/bar overlap. */}
      <div className="flex h-[200px] w-full flex-col justify-center gap-2.5">
        {data.map((r) => (
          <div key={r.label} className="flex items-center gap-2.5">
            <span className="w-24 shrink-0 truncate text-start text-xs text-muted-foreground" title={r.label}>
              {r.label}
            </span>
            <span className="h-4 flex-1 overflow-hidden rounded-md bg-muted/60">
              <span
                className="block h-full rounded-md transition-all duration-500"
                style={{ width: `${max ? (r.value / max) * 100 : 0}%`, background: cvar("--chart-4") }}
              />
            </span>
            <span className="w-9 shrink-0 text-end text-xs font-medium tabular text-foreground">
              {r.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

/* ── 5. Incidents by Category — segmented meter ────────────────────────────── */
function IncidentsByCategoryCard({
  byCategory = [],
}: {
  byCategory?: ColoredSlice[];
}) {
  const t = useT();
  const total = React.useMemo(
    () => byCategory.reduce((sum, d) => sum + d.value, 0),
    [byCategory],
  );
  return (
    <ChartCard eyebrow={t("cc.ops.bySeverity")} title={t("cc.ops.incidentsByCategory")} provKey="incidents_by_category">
      <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full">
        {byCategory.map((d) => (
          <div
            key={d.label}
            className="h-full transition-all"
            style={{
              width: `${(d.value / total) * 100}%`,
              background: cvar(d.colorVar),
            }}
            title={`${dl(t, d.label)}: ${d.value}`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
        {byCategory.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: cvar(d.colorVar) }}
            />
            <span className="flex-1 truncate text-muted-foreground">
              {dl(t, d.label)}
            </span>
            <span className="tabular font-medium text-foreground">{d.value}</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

/* ── 6. Operational metrics strip ──────────────────────────────────────────── */
function OpsMetricsStrip({ metrics = [] }: { metrics?: UtilMetric[] }) {
  const t = useT();
  return (
    <Card className="rounded-2xl p-5 shadow-sm transition-all">
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">{t("cc.ops.metrics")}</p>
        <ProvenanceButton surfaceKey="ops_metrics" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m: UtilMetric) => (
          <div key={m.label} className="flex flex-col gap-0.5">
            <span className="flex items-baseline gap-1">
              <span className="tabular text-2xl font-semibold text-foreground">
                {m.value}
              </span>
              {m.unit ? (
                <span className="text-sm text-muted-foreground">{m.unit}</span>
              ) : null}
            </span>
            <span className="text-xs leading-tight text-muted-foreground">
              {dl(t, m.label)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── root ──────────────────────────────────────────────────────────────────── */
export function OperationalAnalytics({
  emergencyTypes = [],
  responseTrend = [],
  callsByHour = [],
  callsByRegion = [],
  incidentsByCategory = [],
  opsMetrics = [],
}: {
  emergencyTypes?: ColoredSlice[];
  responseTrend?: number[];
  callsByHour?: number[];
  callsByRegion?: LabeledValue[];
  incidentsByCategory?: ColoredSlice[];
  opsMetrics?: UtilMetric[];
}) {
  const t = useT();
  const empty =
    emergencyTypes.length === 0 &&
    responseTrend.length === 0 &&
    callsByHour.length === 0 &&
    callsByRegion.length === 0 &&
    incidentsByCategory.length === 0 &&
    opsMetrics.length === 0;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold">
          {t("cc.ops.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("cc.ops.desc")}
        </p>
      </div>

      {empty ? (
        <AwaitingData label={t("cc.ops.awaiting")} />
      ) : (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EmergencyTypesCard items={emergencyTypes} />
        <ResponseTrendCard trend={responseTrend} />
        <CallsByHourCard byHour={callsByHour} />
        <CallsByRegionCard byRegion={callsByRegion} />
        <IncidentsByCategoryCard byCategory={incidentsByCategory} />
        <div className="lg:col-span-1">
          <OpsMetricsStrip metrics={opsMetrics} />
        </div>
      </div>
      )}
    </section>
  );
}
