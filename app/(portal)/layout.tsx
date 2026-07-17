import { redirect } from "next/navigation";

import { PortalShell } from "@/components/layout/portal-shell";
import { getSession } from "@/lib/server-api";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return <PortalShell session={session}>{children}</PortalShell>;
}
