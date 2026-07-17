import { ResearchManagement } from "@/components/workspace/research-management";
import { PageGuide } from "@/components/ui/page-guide";
import { serverT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function ResearchIntelligencePage() {
  const t = serverT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("rs.page.title")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("rs.page.desc")}</p>
      </div>
      <PageGuide
        id="research-intelligence"
        title={t("rs.page.guideTitle")}
        what={t("rs.page.guideWhat")}
        why={t("rs.page.guideWhy")}
        when={t("rs.page.guideWhen")}
        example={t("rs.page.guideExample")}
      />
      <ResearchManagement />
    </div>
  );
}
