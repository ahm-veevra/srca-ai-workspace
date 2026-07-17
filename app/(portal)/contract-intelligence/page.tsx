import { ContractTenderManagement } from "@/components/workspace/contract-tender-management";
import { PageGuide } from "@/components/ui/page-guide";
import { serverT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function ContractIntelligencePage() {
  const t = serverT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("ctm.page.title")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("ctm.page.desc")}</p>
      </div>
      <PageGuide
        id="contract-intelligence"
        title={t("ctm.page.guideTitle")}
        what={t("ctm.page.guideWhat")}
        why={t("ctm.page.guideWhy")}
        when={t("ctm.page.guideWhen")}
        example={t("ctm.page.guideExample")}
      />
      <ContractTenderManagement defaultType="all" />
    </div>
  );
}
