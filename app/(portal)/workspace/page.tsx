import { redirect } from "next/navigation";

import { CommandCenter } from "@/components/command-center/command-center";
import { getSession } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <CommandCenter session={session} />;
}
