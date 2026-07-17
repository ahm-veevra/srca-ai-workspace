"use client";

import {
  ArrowRight, Boxes, Database, FileText, Loader2, Network, Search, ShieldCheck, Sparkles,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { aicpHref } from "@/lib/aicp";
import { apiPost, ApiRequestError } from "@/lib/api-client";

export interface Collection { key: string; name: string }
export interface GraphStats { nodes: Record<string, number>; edges: number }
export interface Entity { id: string; name: string; type: string; mention_count: number }
export interface Fact { id: string; subject: string; predicate: string; object: string; weight: number }

interface Hit {
  chunk_id: string; document_id: string; document_title: string | null;
  content: string; score: number; vector_rank: number | null; keyword_rank: number | null;
}
interface InferenceResult {
  trace_id: string; status: string; output: { text?: string } | null;
  selected_model_key: string | null;
  policy: { pre?: Record<string, unknown> | null; post?: Record<string, unknown> | null } | null;
  latency_ms: number | null; error: { message?: string } | null;
}

function policyAction(d: Record<string, unknown> | null | undefined): string | null {
  if (!d) return null;
  const a = d["action"];
  return typeof a === "string" ? a : null;
}

export function KnowledgeCenter({
  collections, stats, entities, facts,
}: {
  collections: Collection[]; stats: GraphStats; entities: Entity[]; facts: Fact[];
}) {
  const [tab, setTab] = React.useState<"search" | "ask" | "graph">("search");
  const tabs = [
    { key: "search" as const, label: "Search", icon: Search },
    { key: "ask" as const, label: "Ask (RAG)", icon: Sparkles },
    { key: "graph" as const, label: "Connected Knowledge", icon: Network },
  ];
  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                tab === t.key ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}>
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>
      {tab === "search" && <SearchTab collections={collections} />}
      {tab === "ask" && <AskTab collections={collections} />}
      {tab === "graph" && <GraphTab stats={stats} entities={entities} facts={facts} />}
    </div>
  );
}

function CollectionPicker({
  collections, value, onChange,
}: {
  collections: Collection[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="w-56">
      {collections.length === 0 && <option value="">No knowledge base</option>}
      {collections.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
    </Select>
  );
}

function SearchTab({ collections }: { collections: Collection[] }) {
  const [collection, setCollection] = React.useState(collections[0]?.key ?? "");
  const [mode, setMode] = React.useState("hybrid");
  const [query, setQuery] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hits, setHits] = React.useState<Hit[] | null>(null);

  async function run() {
    if (!query.trim() || !collection) return;
    setBusy(true); setError(null);
    try {
      const res = await apiPost<{ mode: string; hits: Hit[] }>("/knowledge/hybrid-search", {
        collection, query, top_k: 8, mode,
      });
      setHits(res.hits);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Search failed.");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-2 pt-5">
          <CollectionPicker collections={collections} value={collection} onChange={setCollection} />
          <Select value={mode} onChange={(e) => setMode(e.target.value)} className="w-36">
            <option value="hybrid">Hybrid</option>
            <option value="vector">Semantic</option>
            <option value="keyword">Keyword</option>
          </Select>
          <Input className="min-w-[14rem] flex-1" placeholder="Search your knowledge…"
            value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") run(); }} />
          <Button onClick={run} disabled={busy || !query.trim() || !collection}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
          </Button>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-danger">{error}</p>}
      {hits && (
        hits.length === 0
          ? <p className="text-sm text-muted-foreground">No matching passages.</p>
          : <div className="space-y-2">
              {hits.map((h) => (
                <Card key={h.chunk_id}>
                  <CardContent className="space-y-1 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <FileText className="h-3.5 w-3.5 text-primary" /> {h.document_title || "Untitled"}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">score {h.score.toFixed(3)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{h.content}</p>
                    {(h.vector_rank != null || h.keyword_rank != null) && (
                      <p className="text-[10px] text-muted-foreground">
                        {h.vector_rank != null && `semantic #${h.vector_rank}`}
                        {h.vector_rank != null && h.keyword_rank != null && " · "}
                        {h.keyword_rank != null && `keyword #${h.keyword_rank}`}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
      )}
    </div>
  );
}

function AskTab({ collections }: { collections: Collection[] }) {
  const [collection, setCollection] = React.useState(collections[0]?.key ?? "");
  const [question, setQuestion] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [answer, setAnswer] = React.useState<{ text: string; meta: InferenceResult } | null>(null);
  const [sources, setSources] = React.useState<Hit[]>([]);

  async function run() {
    if (!question.trim() || !collection) return;
    setBusy(true); setError(null); setAnswer(null); setSources([]);
    try {
      const [inf, src] = await Promise.all([
        apiPost<InferenceResult>("/inference", {
          messages: [{ role: "user", content: question }],
          knowledge: { collection, top_k: 5 }, source: "v-workspace",
        }),
        apiPost<{ hits: Hit[] }>("/knowledge/hybrid-search", {
          collection, query: question, top_k: 4, mode: "vector",
        }).catch(() => ({ hits: [] as Hit[] })),
      ]);
      setSources(src.hits);
      if (inf.status === "completed") {
        setAnswer({ text: inf.output?.text ?? "(no answer)", meta: inf });
      } else {
        setError(inf.error?.message ?? `Request ${inf.status}.`);
      }
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Ask failed.");
    } finally { setBusy(false); }
  }

  const m = answer?.meta;
  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-2 pt-5">
          <CollectionPicker collections={collections} value={collection} onChange={setCollection} />
          <Input className="min-w-[14rem] flex-1" placeholder="Ask a question grounded in your knowledge…"
            value={question} onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") run(); }} />
          <Button onClick={run} disabled={busy || !question.trim() || !collection}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Ask
          </Button>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-danger">{error}</p>}
      {answer && (
        <>
          <Card>
            <CardContent className="space-y-2 pt-4">
              <p className="whitespace-pre-wrap text-sm">{answer.text}</p>
              <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2 text-[11px]">
                <span className="font-medium">Secure AI execution</span>
                {m?.selected_model_key && <Badge variant="secondary" className="gap-1 text-[10px]"><Boxes className="h-3 w-3" /> {m.selected_model_key}</Badge>}
                {(policyAction(m?.policy?.pre) || policyAction(m?.policy?.post)) && (
                  <Badge variant="outline" className="gap-1 text-[10px]"><ShieldCheck className="h-3 w-3" /> policy: {policyAction(m?.policy?.pre) ?? "passed"}/{policyAction(m?.policy?.post) ?? "passed"}</Badge>
                )}
                {m?.latency_ms != null && <span className="text-muted-foreground">{Math.round(m.latency_ms)} ms</span>}
                {m?.trace_id && <a href={aicpHref(`/requests/${m.trace_id}`)} className="text-primary hover:underline">view trace</a>}
              </div>
            </CardContent>
          </Card>
          {sources.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Sources</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {sources.map((h) => (
                  <div key={h.chunk_id} className="rounded-md border border-border/60 p-2 text-xs">
                    <span className="font-medium">{h.document_title || "Untitled"}</span>
                    <p className="text-muted-foreground">{h.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function GraphTab({ stats, entities, facts }: { stats: GraphStats; entities: Entity[]; facts: Fact[] }) {
  const cards = [
    { label: "Entities", value: stats.nodes.entity ?? 0 },
    { label: "Documents", value: stats.nodes.document ?? 0 },
    { label: "Relationships", value: stats.edges },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums">{c.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Database className="h-4 w-4 text-primary" /> Top entities</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {entities.length === 0 && <p className="text-sm text-muted-foreground">No entities yet.</p>}
            {entities.slice(0, 24).map((e) => (
              <span key={e.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 px-2 py-0.5 text-xs">
                {e.name} <span className="text-[10px] text-muted-foreground">×{e.mention_count}</span>
              </span>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Network className="h-4 w-4 text-primary" /> Connected facts</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {facts.length === 0 && <p className="text-sm text-muted-foreground">No facts yet.</p>}
            {facts.slice(0, 12).map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-sm">
                <span className="font-medium">{f.subject}</span>
                <Badge variant="outline" className="font-mono text-[10px]">{f.predicate.replace(/_/g, " ").toLowerCase()}</Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{f.object}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <a href={aicpHref("/graph")} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        Explore the full knowledge graph in AICP <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
