import { BuildCapability } from "@/components/workspace/build-capability";
import { PageGuide } from "@/components/ui/page-guide";

export const dynamic = "force-dynamic";

export default function CreateCapabilityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Build a capability</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Create your own AI capability in a few guided steps — pick a goal, describe what it
          should do, optionally ground it on your knowledge, and it&apos;s ready to run in My
          Capabilities. The Configuration Copilot guides every step.
        </p>
      </div>
      <PageGuide
        id="build-capability"
        title="building a capability"
        what="A guided, business-first way to create a reusable AI capability: choose a goal, name it and describe what it should do, optionally ground it on your knowledge bases, and it's created and exposed under My Capabilities — governed like everything else."
        why="So you can stand up the assistant you need without technical setup, while the platform handles models, governance, audit and cost automatically."
        when="Use it whenever you need a focused, reusable AI experience for a task your team does often."
        example="Goal = HR Assistant → objective 'Answer HR-policy questions' → ground on the HR Handbook knowledge base → create → run it from My Capabilities."
      />
      <BuildCapability />
    </div>
  );
}
