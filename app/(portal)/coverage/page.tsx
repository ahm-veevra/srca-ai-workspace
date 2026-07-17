import { notFound } from "next/navigation";
import { internalToolsEnabled } from "@/lib/internal-tools";
import { CoverageDashboard } from "@/components/workspace/coverage-dashboard";
import { PageGuide } from "@/components/ui/page-guide";

export const dynamic = "force-dynamic";

export default function CoveragePage() {
  // A73: internal QA/demo surface -- 404 in production business deployments.
  if (!internalToolsEnabled()) notFound();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">AICP Capability Coverage</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Every major AICP capability mapped to the SRCA AI Workspace use case that demonstrates it, the
          AICP API it calls, and a live test result. No capability is hidden â each one is runnable
          and verifiable here.
        </p>
      </div>
      <PageGuide
        id="coverage"
        title="the Capability Coverage Dashboard"
        what="A matrix of AICP capabilities, the use case that demonstrates each, the API used, and a live pass/fail test."
        why="So you can prove, on demand, that the whole platform works end-to-end through AICP APIs."
        when="Run the live tests before a demo or after a configuration change to confirm everything is green."
        example="Click 'Run live tests' and watch each capability turn green as it executes through AICP."
      />
      <CoverageDashboard />
    </div>
  );
}
