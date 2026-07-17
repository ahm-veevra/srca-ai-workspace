import { HrManagement } from "@/components/workspace/hr-management";
import { PageGuide } from "@/components/ui/page-guide";
import { serverT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function HrIntelligencePage() {
  const t = serverT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("hr.page.title")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("hr.page.desc")}</p>
      </div>
      <PageGuide
        id="hr-intelligence"
        title={t("hr.page.guideTitle")}
        what={t("hr.page.guideWhat")}
        why={t("hr.page.guideWhy")}
        when={t("hr.page.guideWhen")}
        example={t("hr.page.guideExample")}
      />
      <HrManagement />
    </div>
  );
}
