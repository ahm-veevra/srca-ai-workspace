"use client";

import * as React from "react";
import {
  Bot,
  FileText,
  Languages,
  Presentation,
  SendHorizontal,
  Sparkles,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MarkdownView } from "@/components/ui/markdown";
import { askCopilot } from "@/lib/command-center-assist";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { COPILOT_SUGGESTIONS, DEFAULT_CONFIDENCE } from "@/lib/command-center-types";

import { AiConfidence } from "./ai-confidence";
import { ProvenanceButton } from "./provenance-button";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
}

export function AiCopilot({ capabilityId }: { capabilityId?: string } = {}) {
  const t = useT();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const idRef = React.useRef(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || thinking) return;

    const userMsg: ChatMessage = { id: ++idRef.current, role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);

    let answer: string;
    try {
      // Runs the configured AICP Copilot capability (it owns the prompt/model/grounding).
      answer = await askCopilot({ capabilityId: capabilityId ?? "", question: text });
    } catch {
      answer = capabilityId
        ? t("cc.copilot.errReach")
        : t("cc.copilot.errNoCap");
    }
    setMessages((m) => [...m, { id: ++idRef.current, role: "assistant", text: answer }]);
    setThinking(false);
  }

  const started = messages.length > 0 || thinking;

  return (
    <Card className="flex flex-col rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-base font-semibold leading-none tracking-tight">{t("cc.copilot.title")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("cc.copilot.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="shrink-0 gap-1">
            <Sparkles className="h-3 w-3 text-primary" />
            {t("cc.copilot.badge")}
          </Badge>
          <ProvenanceButton surfaceKey="copilot" />
        </div>
      </div>

      {/* Suggestion chips */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {COPILOT_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(t(s))}
            disabled={thinking}
            className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            {t(s)}
          </button>
        ))}
      </div>

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="mt-4 flex min-h-[220px] flex-1 flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-muted/40 p-4"
      >
        {!started && (
          <div className="m-auto max-w-xs text-center">
            <Sparkles className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-sm font-medium">{t("cc.copilot.empty")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("cc.copilot.emptyHint")}
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex gap-2.5", m.role === "user" ? "flex-row-reverse" : "flex-row")}
          >
            <span
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                m.role === "user"
                  ? "bg-primary/10 text-primary"
                  : "bg-surface-3 text-muted-foreground",
              )}
            >
              {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </span>

            <div className={cn("max-w-[80%]", m.role === "user" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "rounded-tr-sm bg-primary/10 text-foreground"
                    : "rounded-tl-sm border border-border bg-surface-2 text-foreground",
                )}
              >
                {m.role === "assistant" ? <MarkdownView content={m.text} /> : m.text}
              </div>

              {m.role === "assistant" && (
                <div className="mt-2">
                  <AiConfidence
                    value={DEFAULT_CONFIDENCE.value}
                    sources={DEFAULT_CONFIDENCE.sources}
                    horizon={DEFAULT_CONFIDENCE.horizon}
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted-foreground">
              <Bot className="h-3.5 w-3.5" />
            </span>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border bg-surface-2 px-3.5 py-2.5">
              <span className="text-xs text-muted-foreground">{t("cc.copilot.analyzing")}</span>
              <span className="flex gap-1">
                <Dot delay="0ms" />
                <Dot delay="150ms" />
                <Dot delay="300ms" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("cc.copilot.placeholder")}
          className="h-10 flex-1 rounded-xl border border-border bg-surface-2 px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-border-strong focus:bg-background"
        />
        <button
          type="submit"
          disabled={!input.trim() || thinking}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          aria-label="Send message"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>

      {/* Action row (non-functional, styled) */}
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton icon={FileText} label={t("cc.copilot.genPdf")} />
        <ActionButton icon={Presentation} label={t("cc.copilot.genPpt")} />
        <ActionButton icon={Languages} label={t("cc.copilot.translate")} />
      </div>
    </Card>
  );
}

function ActionButton({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:bg-muted hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60"
      style={{ animationDelay: delay }}
    />
  );
}
