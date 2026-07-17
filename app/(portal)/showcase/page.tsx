import { notFound } from "next/navigation";
import { internalToolsEnabled } from "@/lib/internal-tools";
import { ShowcaseCenter } from "@/components/workspace/showcase-center";
import { PageGuide } from "@/components/ui/page-guide";

export const dynamic = "force-dynamic";

export default function ShowcasePage() {
  // A73: internal QA/demo surface -- 404 in production business deployments.
  if (!internalToolsEnabled()) notFound();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">AICP Showcase Center</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Sales-ready stories for every business use case. Each scenario shows the problem, the
          AICP solution, the processing steps, the components involved, the business value and a
          before/after â then launches the live experience.
        </p>
      </div>
      <PageGuide
        id="showcase"
        title="the AICP Showcase Center"
        what="A set of business scenarios that explain the problem, the AICP solution, the value and a before/after â with a one-click launch."
        why="So sales and stakeholders can see and demonstrate AICP's value without technical setup."
        when="Use it to present AICP, or to pick a scenario and run it live."
        example="Open 'Government Correspondence Desk' to see the before/after, then launch the live Center."
      />
      <ShowcaseCenter />
    </div>
  );
}
