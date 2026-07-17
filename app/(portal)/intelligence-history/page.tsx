import { IntelligenceHistory } from "@/components/workspace/intelligence-history";
import { PageGuide } from "@/components/ui/page-guide";

export const dynamic = "force-dynamic";

export default function IntelligenceHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Intelligence History</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Every analysis run in any Intelligence Center is saved here automatically — a single,
          searchable audit trail. Re-open a result, export it as PDF or Word, or remove it.
        </p>
      </div>
      <PageGuide
        id="intelligence-history"
        title="Intelligence History"
        what="A consolidated record of every saved analysis across all Intelligence Centers."
        why="So your team can find, reuse and export past work without re-running it — and keep an audit trail."
        when="Use it to retrieve an earlier contract review, RFP analysis or any result you produced before."
        example="Filter to the Contract center, search a counterparty name, and export the saved review as a Word document."
      />
      <IntelligenceHistory />
    </div>
  );
}
