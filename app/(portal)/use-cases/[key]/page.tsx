import { internalToolsEnabled } from "@/lib/internal-tools";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { UseCaseWorkbench } from "@/components/workspace/usecase-workbench";
import { USE_CASE_CATALOG, useCaseByKey } from "@/lib/usecase-catalog";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return USE_CASE_CATALOG.map((u) => ({ key: u.key }));
}

export default function UseCasePage({ params }: { params: { key: string } }) {
  // A73: internal QA/demo surface -- 404 in production business deployments.
  if (!internalToolsEnabled()) notFound();
  const uc = useCaseByKey(params.key);
  if (!uc) notFound();
  return (
    <div className="space-y-4">
      <Link href="/use-cases" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Use Case Library
      </Link>
      <UseCaseWorkbench ucKey={uc.key} />
    </div>
  );
}
