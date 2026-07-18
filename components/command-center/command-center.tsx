import type { Session } from "@/lib/types";

import { getAicpConfig } from "@/lib/aicp-config";
import { loadCommandCenterData } from "@/lib/command-center-source";
import { AiCopilot } from "./ai-copilot";
import { ProvenanceProvider } from "./provenance-context";
import { AiRecommendations } from "./ai-recommendations";
import { AiSummary } from "./ai-summary";
import { CommandCenterHeader } from "./command-center-header";
import { HowItWorks } from "./how-it-works";
import { IncidentFeed } from "./incident-feed";
import { KnowledgeAssistant } from "./knowledge-assistant";
import { KpiOverview } from "./kpi-overview";
import { OperationalAnalytics } from "./operational-analytics";
import { PredictiveAnalytics } from "./predictive-analytics";
import { ReadinessScore } from "./readiness-score";
import { RiskIntelligence } from "./risk-intelligence";
import { SaudiMap } from "./saudi-map";
import { WhatIfSimulator } from "./what-if-simulator";

function firstNameOf(full: string): string {
  const parts = full.trim().split(/\s+/);
  const head = parts[0]?.replace(/[.,]$/, "").toLowerCase();
  if ((head === "dr" || head === "mr" || head === "ms" || head === "eng") && parts[1]) return parts[1];
  return parts[0] || full;
}

export async function CommandCenter({ session }: { session: Session | null }) {
  // session === null -> kiosk/wallboard mode: data widgets render under the workspace's
  // registered Application identity; the per-user conversational surfaces are hidden.
  const first = session ? firstNameOf(session.user.full_name || session.user.email) : "Operations";
  const activeId = session?.active_tenant?.id;
  const role = session
    ? session.memberships.find((m) => m.tenant.id === activeId)?.role ||
      (session.user.is_superadmin ? "Superadmin" : "Operations")
    : "Wallboard";

  // Every surface is loaded by calling an AICP API — data via the connector, AI via capabilities.
  const data = await loadCommandCenterData();
  const cfg = await getAicpConfig();

  return (
    <ProvenanceProvider
      value={{
        connectorId: cfg.datalakeConnectorId,
        connectorName: data.provenance.connectorName,
        model: data.provenance.model,
        capabilityIds: {
          exec_summary: cfg.briefingCapabilityId,
          call_forecast: cfg.forecastCapabilityId,
          recommendations: cfg.recommendationsCapabilityId,
          copilot: cfg.copilotCapabilityId,
          knowledge: cfg.knowledgeCapabilityId,
          sim: cfg.whatifCapabilityId,
        },
        capabilityNames: data.provenance.capabilityNames,
      }}
    >
    <div className="space-y-6">
      <CommandCenterHeader firstName={first} role={role} updatedAt={data.updatedAt} />

      {/* 1 · Executive KPI overview */}
      <KpiOverview kpis={data.kpis} />

      {/* 2 · AI executive summary + readiness scorecard */}
      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <AiSummary summary={data.summary} capabilityId={cfg.briefingCapabilityId} />
        <ReadinessScore readiness={data.readiness} overall={data.readinessOverall} />
      </div>

      {/* 3 · Interactive operations map */}
      <SaudiMap
        regions={data.mapRegions}
        stations={data.mapStations}
        hospitals={data.mapHospitals}
        incidents={data.mapIncidents}
      />

      {/* 4 · Live incidents + risk intelligence */}
      <div className="grid gap-6 lg:grid-cols-2">
        <IncidentFeed feed={data.incidents} />
        <RiskIntelligence risks={data.risks} />
      </div>

      {/* 5 · Predictive analytics */}
      <PredictiveAnalytics
        forecast={data.forecast}
        forecastCapabilityId={cfg.forecastCapabilityId}
        responsePrediction={data.responsePrediction}
        hotspots={data.hotspots}
        ambulanceDemand={data.ambulanceDemand}
        hospitalCapacity={data.hospitalCapacity}
        fleetMaintenance={data.fleetMaintenance}
        crewFatigue={data.crewFatigue}
      />

      {/* 6 · AI recommendations */}
      <AiRecommendations recommendations={data.recommendations} capabilityId={cfg.recommendationsCapabilityId} />

      {/* 7 · Operational analytics */}
      <OperationalAnalytics
        emergencyTypes={data.emergencyTypes}
        responseTrend={data.responseTrend}
        callsByHour={data.callsByHour}
        callsByRegion={data.callsByRegion}
        incidentsByCategory={data.incidentsByCategory}
        opsMetrics={data.opsMetrics}
      />

      {/* 8 · Conversational AI + knowledge — signed-in users only: these run under the
          user's own clearance/audit identity, never the wallboard's app token. */}
      {session && (
        <div className="grid gap-6 lg:grid-cols-2">
          <AiCopilot capabilityId={cfg.copilotCapabilityId} />
          <KnowledgeAssistant capabilityId={cfg.knowledgeCapabilityId} />
        </div>
      )}

      {/* 9 · What-if simulator */}
      <WhatIfSimulator baseline={data.simBaseline} scenarios={data.simScenarios} capabilityId={cfg.whatifCapabilityId} />

      {/* 10 · Architecture */}
      <HowItWorks />
    </div>
    </ProvenanceProvider>
  );
}
