import { CommandCenter } from "@/components/command-center/command-center";

export const dynamic = "force-dynamic";

/**
 * Kiosk / wall-display mode: the command center with NO signed-in user. Data widgets load
 * under the registered "SRCA Workspace" Application identity (X-API-Key fallback in
 * serverApi); the per-user conversational surfaces are hidden. AICP's grant model — not
 * this page — decides what the wallboard identity may access.
 */
export default async function WallboardPage() {
  return (
    <main className="mx-auto max-w-screen-2xl px-6 py-6">
      <CommandCenter session={null} />
    </main>
  );
}
