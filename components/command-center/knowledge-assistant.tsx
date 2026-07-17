"use client";

import * as React from "react";
import {
  BookOpenCheck,
  FileText,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MarkdownView } from "@/components/ui/markdown";
import { askKnowledge } from "@/lib/command-center-assist";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  KNOWLEDGE_SUGGESTIONS,
  DEFAULT_CONFIDENCE,
  type KnowledgeItem,
} from "@/lib/command-center-types";

import { AiConfidence } from "./ai-confidence";
import { ProvenanceButton } from "./provenance-button";

export function KnowledgeAssistant({ capabilityId }: { capabilityId?: string } = {}) {
  const t = useT();
  const [input, setInput] = React.useState("");
  const [result, setResult] = React.useState<KnowledgeItem | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function ask(raw: string) {
    const text = raw.trim();
    if (!text || loading) return;
    setInput(text);
    setLoading(true);
    setResult(null);

    let item: KnowledgeItem;
    try {
      if (!capabilityId) throw new Error("no knowledge capability configured");
      // Runs the configured AICP Knowledge capability (it owns retrieval, prompt and model).
      const { answer, citations } = await askKnowledge({ capabilityId, question: text });
      item = { question: text, answer, citations };
    } catch {
      item = {
        question: text,
        answer: capabilityId
          ? t("cc.knowledge.errReach")
          : t("cc.knowledge.errNoCap"),
        citations: [],
      };
    }
    setResult(item);
    setLoading(false);
  }

  return (
    <Card className="flex flex-col rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpenCheck className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-base font-semibold leading-none tracking-tight">
              {t("cc.knowledge.title")}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("cc.knowledge.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="shrink-0 gap-1">
            <Sparkles className="h-3 w-3 text-primary" />
            {t("cc.knowledge.badge")}
          </Badge>
          <ProvenanceButton surfaceKey="knowledge" />
        </div>
      </div>

      {/* Suggestions */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {KNOWLEDGE_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(t(s))}
            disabled={loading}
            className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            {t(s)}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("cc.knowledge.placeholder")}
            className="h-10 w-full rounded-xl border border-border bg-surface-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-border-strong focus:bg-background"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          aria-label="Ask"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {/* Result area */}
      <div className="mt-4 min-h-[200px] flex-1 rounded-xl border border-border bg-muted/40 p-4">
        {!result && !loading && (
          <div className="flex h-full min-h-[168px] flex-col items-center justify-center text-center">
            <ShieldCheck className="h-6 w-6 text-success" />
            <p className="mt-2 text-sm font-medium">{t("cc.knowledge.empty")}</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              {t("cc.knowledge.emptyHint")}
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4 animate-pulse text-primary" />
            <span>{t("cc.knowledge.retrieving")}</span>
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "300ms" }} />
            </span>
          </div>
        )}

        {result && !loading && (
          <div>
            <p className="text-sm font-medium text-foreground">{result.question}</p>
            <MarkdownView content={result.answer} className="mt-2 text-sm leading-relaxed text-muted-foreground [word-break:break-word]" />

            {/* Citations */}
            {result.citations.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                <span className="eyebrow">{t("cc.knowledge.citations")}</span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {result.citations.map((c, i) => (
                  <a
                    key={`${i}-${c.title}`}
                    href="#"
                    className="group flex items-start gap-2.5 rounded-xl border border-border bg-surface-2 p-3 transition-colors hover:border-border-strong hover:bg-muted"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-foreground group-hover:text-primary">
                        {c.title}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {c.source}
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
            )}

            <div className="mt-4">
              <AiConfidence
                value={DEFAULT_CONFIDENCE.value}
                sources={DEFAULT_CONFIDENCE.sources}
                horizon={DEFAULT_CONFIDENCE.horizon}
                reasoning="Answer retrieved and synthesized from cited SRCA First Aid protocols in the knowledge base."
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
