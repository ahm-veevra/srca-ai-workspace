"use client";

import * as React from "react";
import { Database, Loader2, SendHorizontal, Sparkles } from "lucide-react";

import { askDataAction } from "@/app/(portal)/ai-intelligence/actions";
import { Card } from "@/components/ui/card";
import { MarkdownView } from "@/components/ui/markdown";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { LineageButton } from "./lineage-button";

const EXAMPLES = [
  "Which region had the slowest response time this week?",
  "Compare cardiac vs road-traffic calls today.",
  "What is our current SLA compliance and why?",
];

export function AskYourData({
  configured,
  capabilityId,
  capabilityName,
}: {
  configured: boolean;
  capabilityId?: string;
  capabilityName?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [answer, setAnswer] = React.useState<string | null>(null);
  const [model, setModel] = React.useState<string | undefined>();
  const [error, setError] = React.useState<string | null>(null);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    const res = await askDataAction(text, locale);
    if (res.ok) {
      setAnswer(res.output);
      setModel(res.model);
    } else {
      setError(res.noCapability ? t("ai.ask.awaitingCap") : t("ai.ask.error"));
      setAnswer(null);
    }
    setBusy(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(q);
  };

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-semibold">{t("ai.ask.title")}</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Database className="h-3 w-3" /> AICP
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{t("ai.ask.subtitle")}</p>
        </div>
        <LineageButton
          icon="sparkles"
          sourceLabel={t("ai.lin.srcCapability")}
          rows={[
            {
              label: t("ai.lin.capability"),
              value: capabilityName
                ? `${capabilityName}${capabilityId ? ` (${capabilityId.slice(0, 8)})` : ""}`
                : capabilityId || "—",
            },
            { label: t("ai.lin.model"), value: model ?? t("ai.lin.modelAtRun") },
          ]}
          endpoints={capabilityId ? [`/ai-capabilities/${capabilityId}/run`] : []}
        />
      </div>

      {!configured ? (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          {t("ai.ask.awaitingCap")}
        </p>
      ) : (
        <>
          <form onSubmit={onSubmit} className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={busy}
              placeholder={t("ai.ask.placeholder")}
              className="h-11 flex-1 rounded-xl border border-border bg-surface-2 px-4 text-sm outline-none transition-colors focus:border-primary/50 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !q.trim()}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4 rtl:-scale-x-100" />}
              {t("ai.ask.send")}
            </button>
          </form>

          {/* Example prompts */}
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                disabled={busy}
                onClick={() => {
                  setQ(ex);
                  ask(ex);
                }}
                className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Answer */}
          {busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("ai.ask.thinking")}
            </p>
          )}
          {error && !busy && <p className="text-sm text-danger">{error}</p>}
          {answer && !busy && (
            <div className="rounded-xl border border-border bg-surface-2 p-4">
              <MarkdownView content={answer} className="text-sm leading-relaxed text-foreground [word-break:break-word]" />
              {model && (
                <p className={cn("mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground")}>
                  <Database className="me-1 inline h-3 w-3" /> {model}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
