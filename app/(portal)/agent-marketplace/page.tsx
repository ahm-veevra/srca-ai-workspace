import { AgentMarketplace, type Agent, type Tool } from "@/components/workspace/agent-marketplace";
import { PageGuide } from "@/components/ui/page-guide";
import { serverApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function AgentMarketplacePage() {
  // No silent catch: a fetch failure throws to the route error boundary (clear error + retry)
  // instead of masquerading as "no agents".
  const [agents, tools] = await Promise.all([
    serverApi<Agent[]>("/agents"),
    serverApi<Tool[]>("/agents/tools"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Agent Marketplace</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Browse your organisation&apos;s AI agents and put them to work. Each agent has a
          purpose, tools and a model, runs under your governance and audit, and shows its
          execution steps — all in one secure workspace.
        </p>
      </div>
      <PageGuide
        id="agent-marketplace"
        title="the Agent Marketplace"
        what="A catalogue of governed AICP agents you can launch — each with a purpose, tools, model and a visible execution trace."
        why="So teams can offload multi-step tasks to AI agents without leaving the business workspace."
        when="Open an agent, give it a task, and watch it run step by step."
        example="Launch the Research Assistant with a question and see its answer plus the steps and trace behind it."
      />
      <AgentMarketplace agents={agents} tools={tools} />
    </div>
  );
}
