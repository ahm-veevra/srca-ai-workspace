import { DocumentManagement } from "@/components/workspace/document-management";
import { PageGuide } from "@/components/ui/page-guide";
import { serverT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function DocumentIntelligencePage() {
  const t = serverT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("dms.page.title")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("dms.page.desc")}</p>
      </div>
      <PageGuide
        id="document-intelligence"
        title={t("dms.page.guideTitle")}
        what={t("dms.page.guideWhat")}
        why={t("dms.page.guideWhy")}
        when={t("dms.page.guideWhen")}
        example={t("dms.page.guideExample")}
      />
      <DocumentManagement />
    </div>
  );
}
