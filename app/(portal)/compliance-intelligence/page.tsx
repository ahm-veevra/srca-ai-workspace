import { ComplianceManagement } from "@/components/workspace/compliance-management";
import { PageGuide } from "@/components/ui/page-guide";
import { serverT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function ComplianceIntelligencePage() {
  const t = serverT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("co.page.title")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("co.page.desc")}</p>
      </div>
      <PageGuide
        id="compliance-intelligence"
        title={t("co.page.guideTitle")}
        what={t("co.page.guideWhat")}
        why={t("co.page.guideWhy")}
        when={t("co.page.guideWhen")}
        example={t("co.page.guideExample")}
      />
      <ComplianceManagement />
    </div>
  );
}
