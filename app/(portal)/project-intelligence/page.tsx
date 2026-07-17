import { ProjectManagement } from "@/components/workspace/project-management";
import { PageGuide } from "@/components/ui/page-guide";
import { serverT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function ProjectIntelligencePage() {
  const t = serverT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("pj.page.title")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("pj.page.desc")}</p>
      </div>
      <PageGuide
        id="project-intelligence"
        title={t("pj.page.guideTitle")}
        what={t("pj.page.guideWhat")}
        why={t("pj.page.guideWhy")}
        when={t("pj.page.guideWhen")}
        example={t("pj.page.guideExample")}
      />
      <ProjectManagement />
    </div>
  );
}
