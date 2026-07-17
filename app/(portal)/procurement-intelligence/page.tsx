import { ProcurementManagement } from "@/components/workspace/procurement-management";
import { PageGuide } from "@/components/ui/page-guide";
import { serverT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function ProcurementIntelligencePage() {
  const t = serverT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("pr.page.title")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("pr.page.desc")}</p>
      </div>
      <PageGuide
        id="procurement-intelligence"
        title={t("pr.page.guideTitle")}
        what={t("pr.page.guideWhat")}
        why={t("pr.page.guideWhy")}
        when={t("pr.page.guideWhen")}
        example={t("pr.page.guideExample")}
      />
      <ProcurementManagement />
    </div>
  );
}
