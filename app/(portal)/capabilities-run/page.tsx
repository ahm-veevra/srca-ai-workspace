import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { serverApi } from "@/lib/server-api";

interface Exposed {
  id: string;
  key: string;
  name: string;
  objective: string;
  category: string;
  ai_tasks: string[];
}

export const dynamic = "force-dynamic";

export default async function MyCapabilitiesPage() {
  // No silent catch: a fetch failure throws to the route error boundary (clear error + retry)
  // instead of masquerading as "no capabilities assigned to you".
  const caps = await serverApi<Exposed[]>("/ai-capabilities/exposed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">My Capabilities</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Business capabilities your organisation has configured and exposed to the workspace. Each
          runs through the governed AICP gateway with its own model, knowledge and policies.
        </p>
      </div>

      {caps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No capabilities exposed yet. An administrator can expose one from the AICP console.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {caps.map((c) => (
            <Link key={c.id} href={`/capabilities-run/${c.id}`}>
              <Card className="flex h-full flex-col transition-colors hover:border-border-strong">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{c.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-2">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {c.objective || "No objective set."}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <Badge variant="secondary" className="text-[10px]">{c.category}</Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
