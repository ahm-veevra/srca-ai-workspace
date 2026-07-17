"use client";

import * as React from "react";
import { Clock, Database, Radio } from "lucide-react";

import { useT } from "@/lib/i18n";

/** Human "x ago" from an ISO timestamp, given the current epoch ms. */
function relTime(iso: string, nowMs: number, t: ReturnType<typeof useT>): string {
  const s = Math.max(0, Math.floor((nowMs - Date.parse(iso)) / 1000));
  if (s < 5) return t("cc.time.justNow");
  if (s < 60) return t("cc.time.secAgo", { n: s });
  const m = Math.floor(s / 60);
  if (m < 60) return t("cc.time.minAgo", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("cc.time.hrAgo", { n: h });
  return t("cc.time.dayAgo", { n: Math.floor(h / 24) });
}

export function CommandCenterHeader({
  firstName,
  role,
  updatedAt = null,
}: {
  firstName: string;
  role: string;
  updatedAt?: string | null;
}) {
  const t = useT();
  const [clock, setClock] = React.useState("");
  const [greeting, setGreeting] = React.useState("");
  const [nowMs, setNowMs] = React.useState(0);

  React.useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setNowMs(d.getTime());
      const h = d.getHours();
      setGreeting(h < 12 ? t("cc.header.morning") : h < 18 ? t("cc.header.afternoon") : t("cc.header.evening"));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
    // Re-run when locale changes so the greeting (via t) isn't a stale English closure.
  }, [t]);

  const live = !!updatedAt;
  const updatedAbs = updatedAt ? new Date(updatedAt).toLocaleString() : "";

  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow text-primary">{t("cc.header.eyebrow")}</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t("cc.header.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {greeting ? `${greeting}, ` : ""}
          <span className="font-medium text-foreground">{firstName}</span> · {role}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        {live ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            {t("cc.header.connected")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
            <span className="h-2 w-2 rounded-full bg-warning" />
            {t("cc.header.awaiting")}
          </span>
        )}
        <span className="flex items-center gap-3 text-xs text-muted-foreground">
          {live && (
            <span className="inline-flex items-center gap-1 tabular" title={`Data fetched ${updatedAbs}`}>
              <Clock className="h-3.5 w-3.5" /> {t("cc.header.updated", { ago: relTime(updatedAt!, nowMs, t) })}
            </span>
          )}
          <span className="inline-flex items-center gap-1"><Radio className="h-3.5 w-3.5" /> {t("cc.header.live997")}</span>
          <span className="inline-flex items-center gap-1 tabular"><Database className="h-3.5 w-3.5" /> {clock || "—"}</span>
        </span>
      </div>
    </header>
  );
}
