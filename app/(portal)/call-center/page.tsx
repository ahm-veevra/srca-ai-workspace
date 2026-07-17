import { CallCenter } from "@/components/workspace/call-center";
import { PageGuide } from "@/components/ui/page-guide";
import { serverT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function CallCenterPage() {
  const t = serverT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("call.page.title")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("call.page.desc")}</p>
      </div>
      <PageGuide
        id="call-center"
        title={t("call.page.guideTitle")}
        what={t("call.page.guideWhat")}
        why={t("call.page.guideWhy")}
        when={t("call.page.guideWhen")}
        example={t("call.page.guideExample")}
      />
      <CallCenter />
    </div>
  );
}
