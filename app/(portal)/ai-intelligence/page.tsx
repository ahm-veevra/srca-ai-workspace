import { Sparkles } from "lucide-react";

import { AskYourData } from "@/components/ai-intelligence/ask-your-data";
import { CallTriage } from "@/components/ai-intelligence/call-triage";
import { GovernancePanel } from "@/components/ai-intelligence/governance-panel";
import { ModelCostPanel } from "@/components/ai-intelligence/model-cost-panel";
import { getAicpConfig } from "@/lib/aicp-config";
import { fetchCapabilityName, loadGovernanceData, loadModelCostData } from "@/lib/ai-intelligence-source";
import { serverT } from "@/lib/i18n/server";
import { getSession } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function AiIntelligencePage() {
  const t = serverT();
  const session = await getSession();
  const [data, modelCost, cfg] = await Promise.all([
    loadGovernanceData(),
    loadModelCostData(),
    getAicpConfig(),
  ]);
  const askCapId = cfg.askDataCapabilityId || cfg.copilotCapabilityId;
  const askConfigured = !!askCapId;
  const triageCapId = cfg.triageCapabilityId || cfg.copilotCapabilityId;
  const [askCapName, triageCapName] = session
    ? await Promise.all([fetchCapabilityName(askCapId), fetchCapabilityName(triageCapId)])
    : [undefined, undefined];

  return (
    <div className="space-y-8">
      <header className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{t("ai.title")}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{t("ai.subtitle")}</p>
        </div>
      </header>

      {/* Ask Your Data — natural-language analytics (per-user; only when signed in) */}
      {session && <AskYourData configured={askConfigured} capabilityId={askCapId} capabilityName={askCapName} />}

      {/* 997 Call Triage — transcription + AI severity/protocol assessment (per-user) */}
      {session && <CallTriage configured={!!triageCapId} capabilityId={triageCapId} capabilityName={triageCapName} />}

      {/* Governance & Audit — platform posture */}
      <GovernancePanel data={data} />

      {/* Model & Cost — FinOps observability */}
      <ModelCostPanel data={modelCost} />
    </div>
  );
}
