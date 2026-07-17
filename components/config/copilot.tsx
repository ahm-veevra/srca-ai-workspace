"use client";

import * as React from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api-client";

/**
 * Deterministic guidance for the current step. This is the Rules Copilot: it is computed on the
 * client, never calls a model, and is ALWAYS shown — the platform must be fully configurable in
 * air-gapped deployments with no AI model installed. `warnings` may be derived live from the
 * user's current selections (dependency/conflict detection).
 */
export interface CopilotNote {
  /** Plain-language explanation of what this step decides. */
  explain: string;
  /** The recommended choice and the reason for it. */
  recommend?: string;
  /** Enterprise best practices for this step. */
  bestPractices?: string[];
  /** Government / sovereign guidance (data residency, classification, on-prem, PDPL/NCA/DGA). */
  government?: string;
  /** Conflicts or readiness issues detected from the current configuration. */
  warnings?: string[];
}

interface Availability {
  ask_enabled: boolean;
  model: string | null;
}

interface AskTurn {
  q: string;
  a: string;
  source: string;
}

function Section({
  icon: Icon,
  title,
  tone = "default",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone?: "default" | "accent" | "warn" | "gov";
  children: React.ReactNode;
}) {
  const toneCls =
    tone === "warn"
      ? "text-warning"
      : tone === "gov"
        ? "text-info"
        : tone === "accent"
          ? "text-accent"
          : "text-muted-foreground";
  return (
    <div className="space-y-1">
      <p className={`flex items-center gap-1.5 text-xs font-semibold ${toneCls}`}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      <div className="text-sm text-foreground/90">{children}</div>
    </div>
  );
}

/**
 * The embedded two-layer Configuration Copilot.
 *
 * Layer 1 (always on): the Rules Copilot — renders the deterministic `note` for the current step.
 * Layer 2 (optional): "Ask Copilot" — appears only when an AI model is configured
 * (GET /copilot/availability), and answers free-text questions via POST /copilot/ask. With no
 * model, the Ask box is replaced by an honest note and the rules guidance stands alone.
 */
export function CopilotPanel({
  note,
  area,
  context,
}: {
  note: CopilotNote;
  /** What is being configured, e.g. "connector" — sent to Ask Copilot for grounding. */
  area: string;
  /** Current wizard selections (no secrets) — sent to Ask Copilot for grounding. */
  context?: Record<string, unknown>;
}) {
  const [avail, setAvail] = React.useState<Availability | null>(null);
  const [question, setQuestion] = React.useState("");
  const [turns, setTurns] = React.useState<AskTurn[]>([]);
  const [asking, setAsking] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    apiGet<Availability>("/copilot/availability")
      .then((a) => active && setAvail(a))
      .catch(() => active && setAvail({ ask_enabled: false, model: null }));
    return () => {
      active = false;
    };
  }, []);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setQuestion("");
    try {
      const res = await apiPost<{ answer: string; source: string }>("/copilot/ask", {
        question: q,
        area,
        context,
      });
      setTurns((t) => [...t, { q, a: res.answer, source: res.source }]);
    } catch {
      setTurns((t) => [
        ...t,
        { q, a: "The copilot could not answer just now. The guidance above still applies.", source: "unavailable" },
      ]);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-2/40 p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 font-display text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-accent" /> Configuration Copilot
        </p>
        <Badge variant="secondary" className="text-[10px]">
          Guidance
        </Badge>
      </div>

      {/* Layer 1 — Rules Copilot: deterministic, always present. */}
      <div className="space-y-3">
        <Section icon={BookOpen} title="What this step does">
          {note.explain}
        </Section>
        {note.recommend && (
          <Section icon={Lightbulb} title="Recommended" tone="accent">
            {note.recommend}
          </Section>
        )}
        {note.bestPractices && note.bestPractices.length > 0 && (
          <Section icon={CheckCircle2} title="Best practices">
            <ul className="space-y-1">
              {note.bestPractices.map((b, idx) => (
                <li key={idx} className="flex gap-1.5">
                  <span className="text-accent">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
        {note.government && (
          <Section icon={ShieldCheck} title="Government & sovereign" tone="gov">
            {note.government}
          </Section>
        )}
        {note.warnings && note.warnings.length > 0 && (
          <Section icon={AlertTriangle} title="Check this" tone="warn">
            <ul className="space-y-1">
              {note.warnings.map((w, idx) => (
                <li key={idx} className="flex gap-1.5">
                  <span className="text-warning">!</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {/* Layer 2 — Ask Copilot: only when an AI model is configured. */}
      <div className="border-t border-border pt-3">
        {avail?.ask_enabled ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-accent">Ask Copilot</p>
            {turns.length > 0 && (
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {turns.map((t, idx) => (
                  <div key={idx} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{t.q}</p>
                    <p className="whitespace-pre-wrap rounded-md bg-surface-1 p-2 text-sm">{t.a}</p>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={ask} className="flex items-center gap-1.5">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about this configuration…"
                className="h-8 flex-1 rounded-md border border-border bg-[hsl(var(--input))] px-2 text-sm focus:border-accent/60 focus:outline-none"
              />
              <Button type="submit" size="icon" variant="accent" disabled={asking} className="h-8 w-8">
                {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Configure an AI model to unlock the conversational <strong>Ask Copilot</strong>. All
            guidance above works without one.
          </p>
        )}
      </div>
    </div>
  );
}
