import { CorrespondenceTracking } from "@/components/workspace/correspondence-tracking";
import { PageGuide } from "@/components/ui/page-guide";
import { serverT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function CorrespondenceIntelligencePage() {
  const t = serverT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("corr.page.title")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("corr.page.desc")}</p>
      </div>
      <PageGuide
        id="correspondence-intelligence"
        title={t("corr.page.guideTitle")}
        what={t("corr.page.guideWhat")}
        why={t("corr.page.guideWhy")}
        when={t("corr.page.guideWhen")}
        example={t("corr.page.guideExample")}
      />
      <CorrespondenceTracking />
    </div>
  );
}
