import { ShieldAlert } from "lucide-react";

import { AicpConfigForm } from "@/components/settings/aicp-config-form";
import { Card } from "@/components/ui/card";
import { getAicpConfigForDisplay } from "@/lib/aicp-config";
import { getSession } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function AicpConfigPage() {
  const session = await getSession();
  const allowed =
    !!session &&
    (session.user.is_superadmin ||
      session.permissions.includes("*") ||
      session.permissions.includes("config.write"));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">AICP Configuration</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Manage how this workspace connects to the AICP platform — backend and console URLs, the
          command-center data-lake connector, and any additional parameters or keys. Settings are
          stored on the server and applied to server-side reads immediately.
        </p>
      </div>

      {allowed ? (
        <AicpConfigForm initial={await getAicpConfigForDisplay()} />
      ) : (
        <Card className="flex items-start gap-3 p-5">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="space-y-1">
            <p className="font-medium">Configuration is restricted</p>
            <p className="text-sm text-muted-foreground">
              You need administrator access (or the <code>config.write</code> permission) to view
              and change AICP connection settings. Ask a workspace administrator if you need it.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
