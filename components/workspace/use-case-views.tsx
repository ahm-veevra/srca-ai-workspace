"use client";

import {
  ArrowRight, Boxes, Download, FileCog, HelpCircle, Layers, Network, ShieldCheck, Workflow,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aicpHref } from "@/lib/aicp";
import { type AnalysisMeta } from "@/components/workspace/analysis-meta";
import { type ConfigItem, type UseCase } from "@/lib/use-cases";
import { useT } from "@/lib/i18n";

type View = "business" | "technical" | "configuration" | "architecture";
type T = ReturnType<typeof useT>;

function FlowChain({ steps, tone = "text-primary" }: { steps: string[]; tone?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-y-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center">
          <span className="rounded-lg border border-border bg-surface-2/50 px-3 py-1.5 text-sm">{s}</span>
          {i < steps.length - 1 && <ArrowRight className={cn("mx-1 h-4 w-4", tone)} />}
        </div>
      ))}
    </div>
  );
}

/** Resolve a Configuration item's live value from the run meta (or its static detail). */
function configValue(item: ConfigItem, meta: AnalysisMeta, t: T): string {
  switch (item.source) {
    case "model": return meta.model ?? item.detail ?? "—";
    case "route": return meta.route_rule ?? item.detail ?? "—";
    case "policy":
      return meta.policy_pre || meta.policy_post
        ? `${t("sf.prov.input")}: ${meta.policy_pre ?? t("sf.meta.passed")} · ${t("sf.prov.output")}: ${meta.policy_post ?? t("sf.meta.passed")}`
        : item.detail ?? t("sf.uc.applied");
    case "knowledge": return meta.knowledge ?? item.detail ?? t("sf.uc.none");
    case "prompt": return item.detail ?? t("sf.uc.managedInstruction");
    default: return item.detail ?? "—";
  }
}

export function UseCaseViews({ useCase, meta }: { useCase: UseCase; meta: AnalysisMeta }) {
  const t = useT();
  const [view, setView] = React.useState<View>("business");

  const decisions = [
    {
      label: t("sf.uc.selectedModel"),
      value: meta.model ?? "—",
      reason: meta.route_reason
        ? `${meta.route_reason}${meta.route_rule ? ` (rule: ${meta.route_rule})` : ""}`
        : t("sf.uc.routingDefault"),
      fallback: (meta.fallbacks && meta.fallbacks.length) ? meta.fallbacks.join(", ") : t("sf.uc.none"),
    },
    {
      label: t("sf.uc.governancePolicy"),
      value: meta.policy_pre || meta.policy_post
        ? `${t("sf.prov.input")} ${meta.policy_pre ?? t("sf.meta.passed")} / ${t("sf.prov.output")} ${meta.policy_post ?? t("sf.meta.passed")}`
        : t("sf.uc.applied"),
      reason: t("sf.uc.policyEnforced", {
        sens: meta.sensitivity ? t("sf.uc.atSensitivity", { s: meta.sensitivity }) : "",
      }),
      fallback: t("sf.uc.policyBlockedFallback"),
    },
    ...(meta.knowledge ? [{
      label: t("sf.uc.knowledgeSource"),
      value: meta.knowledge,
      reason: t("sf.uc.knowledgeReason"),
      fallback: t("sf.uc.none"),
    }] : []),
  ];

  function snapshot() {
    return {
      use_case: useCase.title,
      business_view: useCase.businessView,
      technical_view: useCase.technicalView,
      architecture_view: useCase.architectureView,
      configuration: useCase.configuration.map((c) => ({ label: c.label, value: configValue(c, meta, t) })),
      decisions,
      execution: {
        model: meta.model, route_rule: meta.route_rule, route_reason: meta.route_reason,
        fallbacks: meta.fallbacks, sensitivity: meta.sensitivity,
        policy_input: meta.policy_pre, policy_output: meta.policy_post, trace_id: meta.trace_id,
      },
      generated_by: "SRCA AI Workspace · powered by AICP",
    };
  }
  function download(suffix: string, obj: unknown) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${useCase.key}-${suffix}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { key: View; label: string; icon: typeof Layers }[] = [
    { key: "business", label: t("sf.uc.tabBusiness"), icon: Layers },
    { key: "technical", label: t("sf.uc.tabTechnical"), icon: Workflow },
    { key: "configuration", label: t("sf.uc.tabConfiguration"), icon: FileCog },
    { key: "architecture", label: t("sf.uc.tabArchitecture"), icon: Network },
  ];

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Boxes className="h-4 w-4 text-primary" /> {t("sf.uc.howProduced")}
        </CardTitle>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" onClick={() => download("configuration", snapshot())}>
            <Download className="h-3.5 w-3.5" /> {t("sf.uc.btnConfiguration")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => download("architecture", {
            business_capability: useCase.title, aicp_services: useCase.architectureView,
            technical_pipeline: useCase.technicalView,
          })}>
            <Download className="h-3.5 w-3.5" /> {t("sf.uc.btnArchitecture")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => download("blueprint", snapshot())}>
            <Download className="h-3.5 w-3.5" /> {t("sf.uc.btnBlueprint")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Decision explainability */}
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <HelpCircle className="h-4 w-4 text-primary" /> {t("sf.uc.whyDecisions")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {decisions.map((d) => (
              <div key={d.label} className="rounded-lg border border-border/60 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{d.label}</p>
                <p className="text-sm font-semibold">{d.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{d.reason}</p>
                <p className="mt-0.5 text-xs text-muted-foreground"><span className="font-medium">{t("sf.uc.fallback")}</span> {d.fallback}</p>
              </div>
            ))}
          </div>
        </div>

        {/* View tabs */}
        <div className="flex flex-wrap gap-1 border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setView(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-sm font-medium transition-colors",
                  view === tab.key ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}>
                <Icon className="h-3.5 w-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        {view === "business" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("sf.uc.businessDesc")}</p>
            <FlowChain steps={useCase.businessView} />
          </div>
        )}
        {view === "technical" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("sf.uc.technicalDesc")}</p>
            <FlowChain steps={useCase.technicalView} tone="text-success" />
          </div>
        )}
        {view === "architecture" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("sf.uc.architectureDesc")}</p>
            <div className="flex flex-wrap items-center gap-y-2">
              {useCase.architectureView.map((s, i) => (
                <div key={i} className="flex items-center">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2/50 px-3 py-1.5 text-sm">
                    <Network className="h-3.5 w-3.5 text-primary" /> {s}
                  </span>
                  {i < useCase.architectureView.length - 1 && <ArrowRight className="mx-1 h-4 w-4 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </div>
        )}
        {view === "configuration" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {useCase.configuration.map((c) => (
              <div key={c.label} className="flex items-start justify-between gap-2 rounded-lg border border-border/60 p-2.5">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {c.source === "policy" ? <ShieldCheck className="h-3.5 w-3.5 text-primary" /> : <Layers className="h-3.5 w-3.5 text-primary" />}
                  {c.label}
                </span>
                <span className="text-end text-xs text-muted-foreground">{configValue(c, meta, t)}</span>
              </div>
            ))}
            {meta.trace_id && (
              <a href={aicpHref(`/requests/${meta.trace_id}`)}
                className="col-span-full inline-flex items-center gap-1 text-xs text-primary hover:underline">
                {t("sf.uc.openTrace")} <ArrowRight className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
