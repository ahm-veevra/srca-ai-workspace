"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Sparkles } from "lucide-react";

import { useT } from "@/lib/i18n";
import { QUICK_ACTIONS } from "@/lib/srca-portal";

const SUGGESTIONS = [
  "Summarize today's 997 operational picture",
  "What are the steps for adult CPR?",
  "Nearest available ambulance to a Riyadh incident",
  "First-aid protocol for a suspected stroke",
];

/**
 * The intelligent-portal hero: a time-aware greeting and a prominent "Ask Hilal" prompt bar —
 * the single front door to the AICP-governed assistant. Submitting routes to V-GPT with the
 * question pre-filled; the assistant, models, knowledge and governance all live in AICP.
 */
export function PortalHero({
  firstName,
  role,
  department,
}: {
  firstName: string;
  role: string;
  department: string;
}) {
  const router = useRouter();
  const t = useT();
  const [q, setQ] = React.useState("");
  const [greeting, setGreeting] = React.useState("");
  const [today, setToday] = React.useState("");

  React.useEffect(() => {
    const h = new Date().getHours();
    const key =
      h < 12 ? "home.greeting.morning" : h < 18 ? "home.greeting.afternoon" : "home.greeting.evening";
    setGreeting(t(key as Parameters<typeof t>[0]));
    setToday(
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
  }, [t]);

  function ask(question: string) {
    const text = question.trim();
    if (!text) return;
    router.push(`/v-gpt?q=${encodeURIComponent(text)}`);
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-surface-2 p-6 sm:p-8">
      {/* Brand wash — SRCA red glow, kept subtle so text stays legible in light and dark. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(120% 140% at 100% 0%, hsl(var(--primary) / 0.14) 0%, transparent 55%)," +
            "radial-gradient(90% 120% at 0% 100%, hsl(var(--success) / 0.08) 0%, transparent 55%)",
        }}
        aria-hidden
      />
      <div className="relative">
        <p className="eyebrow text-muted-foreground">{today || " "}</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {greeting ? `${greeting}, ` : ""}
          <span className="text-primary">{firstName}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {role} · {department}
        </p>

        {/* Ask Hilal — the intelligent front door. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
          className="mt-5 flex items-center gap-2 rounded-xl border border-border-strong bg-background px-3 py-2 shadow-sm focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15"
        >
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask Hilal anything — operations, protocols, policies, your requests…"
            aria-label="Ask Hilal"
            className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!q.trim()}
            aria-label="Ask"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>

        {/* Suggestion chips + quick actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.label}
                href={a.href}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                {a.label}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
