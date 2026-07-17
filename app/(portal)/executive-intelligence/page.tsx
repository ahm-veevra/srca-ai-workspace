import { ExecutiveManagement } from "@/components/workspace/executive-management";
import { PageGuide } from "@/components/ui/page-guide";
import { serverT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function ExecutiveIntelligencePage() {
  const t = serverT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("ex.page.title")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("ex.page.desc")}</p>
      </div>
      <PageGuide
        id="executive-intelligence"
        title={t("ex.page.guideTitle")}
        what={t("ex.page.guideWhat")}
        why={t("ex.page.guideWhy")}
        when={t("ex.page.guideWhen")}
        example={t("ex.page.guideExample")}
      />
      <ExecutiveManagement />
    </div>
  );
}
