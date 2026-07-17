import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  CapabilityWorkspace,
  type CapabilityAction,
  type CapabilityTaskLabel,
} from "@/components/workspace/capability-workspace";
import { serverApi } from "@/lib/server-api";

interface Exposed {
  id: string;
  key: string;
  name: string;
  objective: string;
  suggested_prompts?: string[];
  placeholder?: string | null;
  capabilities?: CapabilityTaskLabel[];
  actions?: CapabilityAction[];
}

export const dynamic = "force-dynamic";

export default async function CapabilityRunPage({ params }: { params: { id: string } }) {
  // No silent catch: a fetch failure throws to the route error boundary (clear error + retry)
  // instead of wrongly reporting a live capability as "not available".
  const caps = await serverApi<Exposed[]>("/ai-capabilities/exposed");
  const cap = caps.find((c) => c.id === params.id);

  if (!cap) {
    return (
      <div className="space-y-4">
        <Link href="/capabilities-run" className="flex items-center gap-1 text-sm text-primary">
          <ArrowLeft className="h-4 w-4" /> My Capabilities
        </Link>
        <p className="text-muted-foreground">This capability is not available.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <Link href="/capabilities-run" className="flex items-center gap-1 text-sm text-primary">
        <ArrowLeft className="h-4 w-4" /> My Capabilities
      </Link>
      <div className="min-h-0 flex-1">
        <CapabilityWorkspace
          id={cap.id}
          name={cap.name}
          objective={cap.objective}
          suggestedPrompts={cap.suggested_prompts ?? []}
          placeholder={cap.placeholder}
          capabilities={cap.capabilities ?? []}
          actions={cap.actions ?? []}
        />
      </div>
    </div>
  );
}
