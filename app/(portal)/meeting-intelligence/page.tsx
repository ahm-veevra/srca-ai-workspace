import { MeetingManagement } from "@/components/workspace/meeting-management";
import { PageGuide } from "@/components/ui/page-guide";
import { serverT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function MeetingIntelligencePage() {
  const t = serverT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("mtg.page.title")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("mtg.page.desc")}</p>
      </div>
      <PageGuide
        id="meeting-intelligence"
        title={t("mtg.page.guideTitle")}
        what={t("mtg.page.guideWhat")}
        why={t("mtg.page.guideWhy")}
        when={t("mtg.page.guideWhen")}
        example={t("mtg.page.guideExample")}
      />
      <MeetingManagement />
    </div>
  );
}
