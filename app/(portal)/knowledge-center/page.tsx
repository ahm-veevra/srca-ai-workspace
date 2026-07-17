import {
  KnowledgeCenter, type Collection, type Entity, type Fact, type GraphStats,
} from "@/components/workspace/knowledge-center";
import { PageGuide } from "@/components/ui/page-guide";
import { serverApi } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function KnowledgeCenterPage() {
  // No silent catch: a fetch failure throws to the route error boundary (clear error + retry)
  // instead of masquerading as an empty knowledge base.
  const [collections, stats, entities, facts] = await Promise.all([
    serverApi<Collection[]>("/knowledge/collections"),
    serverApi<GraphStats>("/graph/stats"),
    serverApi<Entity[]>("/graph/entities"),
    serverApi<Fact[]>("/graph/facts"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Knowledge &amp; Search Center</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Find anything across your organisation&apos;s knowledge. Search by keyword, meaning or
          both, ask grounded questions with citations, and explore connected knowledge — all
          through AICP, governed and traceable.
        </p>
      </div>
      <PageGuide
        id="knowledge-center"
        title="the Knowledge & Search Center"
        what="Semantic, keyword and hybrid search over your knowledge bases, grounded Q&A (RAG), and a view of connected knowledge."
        why="So everyone can find answers in your own content instead of guessing or re-reading documents."
        when="Search when you need a passage; Ask when you want a grounded answer; explore Connected Knowledge to see how things relate."
        example="Ask 'What is our procurement policy?' and get a cited answer drawn from your knowledge base."
      />
      <KnowledgeCenter collections={collections} stats={stats} entities={entities} facts={facts} />
    </div>
  );
}
