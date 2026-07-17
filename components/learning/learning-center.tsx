"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Lightbulb } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aicpHref, isAicpRoute } from "@/lib/aicp";
import { GLOSSARY, LEARNING_TRACKS } from "@/lib/learning";

export function LearningCenter() {
  const [active, setActive] = React.useState(LEARNING_TRACKS[0].key);
  const track = LEARNING_TRACKS.find((t) => t.key === active) ?? LEARNING_TRACKS[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Track navigation */}
      <nav className="space-y-1">
        {LEARNING_TRACKS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm transition-colors",
              t.key === active
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            <GraduationCap className="h-4 w-4 shrink-0" />
            {t.title}
          </button>
        ))}
      </nav>

      <div className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{track.title}</h2>
          <p className="text-sm text-muted-foreground">{track.description}</p>
        </div>

        {track.modules.map((m) => (
          <Card key={m.title}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-primary" /> {m.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{m.body}</p>
              <ul className="space-y-1">
                {m.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" /> {p}
                  </li>
                ))}
              </ul>
              {m.links && m.links.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-1">
                  {m.links.map((l) => {
                    const cls = "inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline";
                    return isAicpRoute(l.href) ? (
                      <a key={l.href} href={aicpHref(l.href)} className={cls}>
                        {l.label} <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <Link key={l.href} href={l.href} className={cls}>
                        {l.label} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Glossary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Glossary — terms in plain language</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {GLOSSARY.map((g) => (
                <div key={g.term}>
                  <dt className="text-sm font-medium">{g.term}</dt>
                  <dd className="text-sm text-muted-foreground">{g.definition}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
