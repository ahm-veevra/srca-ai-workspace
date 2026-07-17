import { ShieldAlert } from "lucide-react";

import { DictionaryForm } from "@/components/settings/dictionary-form";
import { Card } from "@/components/ui/card";
import { getLabelOverrides } from "@/lib/i18n/overrides";
import { getSession } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function DictionaryPage() {
  const session = await getSession();
  const allowed =
    !!session &&
    (session.user.is_superadmin ||
      session.permissions.includes("*") ||
      session.permissions.includes("config.write"));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Label Dictionary</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Edit the workspace&apos;s static UI labels in English and Arabic. Your overrides replace the defaults
          everywhere the label appears. AICP-returned content — AI answers, briefings, and data values — is never
          affected and always follows the requested language.
        </p>
      </div>

      {allowed ? (
        <DictionaryForm overrides={getLabelOverrides()} />
      ) : (
        <Card className="flex items-start gap-3 p-5">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="space-y-1">
            <p className="font-medium">Editing labels is restricted</p>
            <p className="text-sm text-muted-foreground">
              You need administrator access (or the <code>config.write</code> permission) to edit the label dictionary.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
