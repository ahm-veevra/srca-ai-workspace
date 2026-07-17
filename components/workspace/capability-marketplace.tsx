import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aicpHref, isAicpRoute } from "@/lib/aicp";
import { CAPABILITY_COVERAGE } from "@/lib/workspace";

export function CapabilityMarketplace() {
  const live = CAPABILITY_COVERAGE.filter((c) => c.status === "live").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="success">{live} of {CAPABILITY_COVERAGE.length} demonstrated</Badge>
        <span className="text-sm text-muted-foreground">
          Every major AICP capability, mapped to a business experience.
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CAPABILITY_COVERAGE.map((c) => {
          const Icon = c.icon;
          const external = c.href ? isAicpRoute(c.href) : false;
          const inner = (
            <Card className={`flex h-full flex-col ${c.href ? "transition-colors hover:border-border-strong" : ""}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" /> {c.capability}
                  </span>
                  {c.status === "live"
                    ? <CheckCircle2 className="h-4 w-4 text-success" />
                    : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-2">
                <p className="text-sm text-muted-foreground">{c.businessValue}</p>
                <p className="text-xs">
                  <span className="text-muted-foreground">Demonstrated in: </span>
                  <span className="font-medium">{c.demonstratedIn}</span>
                </p>
                {c.href && (
                  <div className="mt-auto flex items-center gap-1 pt-1 text-sm text-primary">
                    Launch {external ? <ExternalLink className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  </div>
                )}
              </CardContent>
            </Card>
          );
          if (!c.href) return <div key={c.capability}>{inner}</div>;
          return external
            ? <a key={c.capability} href={aicpHref(c.href)}>{inner}</a>
            : <Link key={c.capability} href={c.href}>{inner}</Link>;
        })}
      </div>
    </div>
  );
}
