import { CapabilityMarketplace } from "@/components/workspace/capability-marketplace";
import { PageGuide } from "@/components/ui/page-guide";

export const dynamic = "force-dynamic";

export default function CapabilitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">AI Capability Marketplace</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Discover everything AICP can do. Each capability is described in business terms, with
          its value and a direct way to try it inside a SRCA AI Workspace Center.
        </p>
      </div>
      <PageGuide
        id="capabilities"
        title="the AI Capability Marketplace"
        what="A catalogue of every major AICP capability — OCR, RAG, agents, governance and more — with its business value."
        why="So you can see at a glance what the platform offers and where each capability is used."
        when="Browse to understand AICP's breadth, or jump straight into the experience that demonstrates a capability."
        example="See 'Semantic & Hybrid Search' and launch the Enterprise Search Center that demonstrates it."
      />
      <CapabilityMarketplace />
    </div>
  );
}
