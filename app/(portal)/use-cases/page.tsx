import { notFound } from "next/navigation";
import { internalToolsEnabled } from "@/lib/internal-tools";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageGuide } from "@/components/ui/page-guide";
import { USE_CASE_CATALOG, CATEGORY_ORDER } from "@/lib/usecase-catalog";

export const dynamic = "force-dynamic";

export default function UseCaseLibraryPage() {
  // A73: internal QA/demo surface -- 404 in production business deployments.
  if (!internalToolsEnabled()) notFound();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Use Case Library</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Every AICP capability, shown as a runnable business use case. Each one explains the
          business value, runs live through AICP APIs, and discloses exactly how AICP is
          configured â provider, model, routing, policies, governance, knowledge and audit.
        </p>
      </div>
      <PageGuide
        id="use-case-library"
        title="the Use Case Library"
        what="A catalogue of 38 business use cases, each demonstrating an AICP capability end-to-end."
        why="So you can demonstrate, test, explain and validate the whole platform from one place."
        when="Pick a use case to run it, inspect its AICP configuration, and see the architecture and technical detail."
        example="Open 'Model Routing Demonstration' to see which model a request routes to â and why."
      />

      <div className="flex items-center gap-2">
        <Badge variant="success">{USE_CASE_CATALOG.length} use cases</Badge>
        <span className="text-sm text-muted-foreground">All runnable through AICP APIs only.</span>
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const items = USE_CASE_CATALOG.filter((u) => u.category === cat);
        return (
          <section key={cat} className="space-y-3">
            <h2 className="font-display text-lg font-semibold">{cat}</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {items.map((u) => {
                const Icon = u.icon;
                return (
                  <Link key={u.key} href={`/use-cases/${u.key}`}>
                    <Card className="flex h-full flex-col transition-colors hover:border-border-strong">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Icon className="h-4 w-4 text-primary" /> {u.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-2">
                        <p className="text-sm text-muted-foreground">{u.business.what}</p>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                          <span className="text-xs text-muted-foreground">{u.capability}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
