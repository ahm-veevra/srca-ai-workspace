"use client";

import * as React from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, Plus, Save, Trash2, XCircle } from "lucide-react";

import {
  revealAicpExtraAction,
  saveAicpConfigAction,
  testAicpBackendAction,
  testDatalakeConnectorAction,
  type TestResult,
} from "@/app/(portal)/settings/aicp/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SECRET_MASK, type AicpConfig, type AicpExtra } from "@/lib/aicp-config-shared";
import { cn } from "@/lib/utils";

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

function TestButton({
  label,
  run,
}: {
  label: string;
  run: () => Promise<TestResult>;
}) {
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<TestResult | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setResult(null);
          try {
            setResult(await run());
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {label}
      </Button>
      {result && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium",
            result.ok ? "text-success" : "text-danger",
          )}
        >
          {result.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {result.message}
        </span>
      )}
    </div>
  );
}

export function AicpConfigForm({ initial }: { initial: AicpConfig }) {
  const [cfg, setCfg] = React.useState<AicpConfig>(initial);
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });
  // Indices whose value is shown in clear text (per-row reveal toggle).
  const [shown, setShown] = React.useState<Set<number>>(new Set());
  const [revealing, setRevealing] = React.useState<number | null>(null);

  const setShownAt = (i: number, on: boolean) =>
    setShown((prev) => {
      const next = new Set(prev);
      on ? next.add(i) : next.delete(i);
      return next;
    });

  // Reveal a row: if it's a still-masked secret, fetch the real value from the server first.
  const reveal = async (i: number) => {
    const e = cfg.extra[i];
    if (e.secret && e.value === SECRET_MASK) {
      setRevealing(i);
      try {
        const res = await revealAicpExtraAction(e.key);
        if (res.ok) setExtra(i, { value: res.value });
        else {
          setStatus({ kind: "error", message: res.error });
          return;
        }
      } finally {
        setRevealing(null);
      }
    }
    setShownAt(i, true);
  };

  const set = <K extends keyof AicpConfig>(k: K, v: AicpConfig[K]) => {
    setCfg((c) => ({ ...c, [k]: v }));
    setStatus({ kind: "idle" });
  };

  const setExtra = (i: number, patch: Partial<AicpExtra>) =>
    set(
      "extra",
      cfg.extra.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    );
  const addExtra = () => set("extra", [...cfg.extra, { key: "", value: "", secret: false }]);
  const removeExtra = (i: number) => set("extra", cfg.extra.filter((_, idx) => idx !== i));

  const save = async () => {
    setStatus({ kind: "saving" });
    const res = await saveAicpConfigAction(cfg);
    setStatus(res.ok ? { kind: "saved" } : { kind: "error", message: res.error ?? "Failed to save." });
  };

  return (
    <div className="space-y-6">
      {/* Connection */}
      <Card className="space-y-5 p-5 sm:p-6">
        <FieldGroup
          title="AICP Connection"
          description="How the workspace reaches the AICP platform. Server-side reads use these immediately; the browser API proxy and console deep-links are read at build time, so those changes need a restart."
        >
          <Field label="AICP Backend URL" htmlFor="apiUrl" help="Server-side API base (maps to API_INTERNAL_URL). e.g. http://localhost:8000">
            <Input
              id="apiUrl"
              value={cfg.apiUrl}
              onChange={(e) => set("apiUrl", e.target.value)}
              placeholder="http://localhost:8000"
            />
          </Field>
          <Field label="AICP Console URL" htmlFor="consoleUrl" help="Used for cross-app deep links (maps to NEXT_PUBLIC_AICP_URL). e.g. http://localhost:3000">
            <Input
              id="consoleUrl"
              value={cfg.consoleUrl}
              onChange={(e) => set("consoleUrl", e.target.value)}
              placeholder="http://localhost:3000"
            />
          </Field>
          <TestButton label="Test backend" run={testAicpBackendAction} />
        </FieldGroup>
      </Card>

      {/* Data lake */}
      <Card className="space-y-5 p-5 sm:p-6">
        <FieldGroup
          title="Command Center Data Lake"
          description="The AICP SQL connector the command center reads 997 operational data through. When empty, every surface falls back to local mock data."
        >
          <Field
            label="Data Lake Connector ID"
            htmlFor="connectorId"
            help="The AICP connector id exposing the srca_datalake saved queries."
          >
            <Input
              id="connectorId"
              value={cfg.datalakeConnectorId}
              onChange={(e) => set("datalakeConnectorId", e.target.value)}
              placeholder="e.g. 7f3c1a90-…"
            />
          </Field>
          <TestButton
            label="Test connector"
            run={() => testDatalakeConnectorAction(cfg.datalakeConnectorId)}
          />
        </FieldGroup>
      </Card>

      {/* AI Capabilities — every AI surface is powered by an AICP capability (no prompts in the app) */}
      <Card className="space-y-5 p-5 sm:p-6">
        <FieldGroup
          title="AI Capabilities"
          description="Each AI surface calls an AICP AI Capability by id — the capability owns the prompt, model and grounding. The workspace only invokes it and renders the result. Blank = that surface shows its empty state."
        >
          <Field label="Executive Briefing Capability" htmlFor="briefingCapabilityId" help="Returns JSON {headline, bullets} for the Daily Operations Briefing.">
            <Input id="briefingCapabilityId" value={cfg.briefingCapabilityId} onChange={(e) => set("briefingCapabilityId", e.target.value)} placeholder="capability id or key" />
          </Field>
          <Field label="Forecast Capability" htmlFor="forecastCapabilityId" help="Returns JSON {forecast:[{label,value,confidence}]} for the call-demand forecast.">
            <Input id="forecastCapabilityId" value={cfg.forecastCapabilityId} onChange={(e) => set("forecastCapabilityId", e.target.value)} placeholder="capability id or key" />
          </Field>
          <Field label="Recommendations Capability" htmlFor="recommendationsCapabilityId" help="Returns JSON {recommendations:[...]} for the decision-intelligence cards.">
            <Input id="recommendationsCapabilityId" value={cfg.recommendationsCapabilityId} onChange={(e) => set("recommendationsCapabilityId", e.target.value)} placeholder="capability id or key" />
          </Field>
          <Field label="Copilot Capability" htmlFor="copilotCapabilityId" help="Conversational agent the AI Copilot invokes with the user's question.">
            <Input id="copilotCapabilityId" value={cfg.copilotCapabilityId} onChange={(e) => set("copilotCapabilityId", e.target.value)} placeholder="capability id or key" />
          </Field>
          <Field label="Knowledge Capability" htmlFor="knowledgeCapabilityId" help="Knowledge/RAG capability the Knowledge Assistant invokes (e.g. Secure Knowledge Search).">
            <Input id="knowledgeCapabilityId" value={cfg.knowledgeCapabilityId} onChange={(e) => set("knowledgeCapabilityId", e.target.value)} placeholder="capability id or key" />
          </Field>
          <Field label="What-If Capability" htmlFor="whatifCapabilityId" help="Estimates the projected impact of selected scenarios. Returns JSON {projected:{response,coverage,...}}. Blank = deterministic delta calculation.">
            <Input id="whatifCapabilityId" value={cfg.whatifCapabilityId} onChange={(e) => set("whatifCapabilityId", e.target.value)} placeholder="(optional) capability id or key" />
          </Field>
          <Field label="Ask-Your-Data Capability" htmlFor="askDataCapabilityId" help="Natural-language analytics for the AICP Intelligence page. Blank falls back to the Copilot capability.">
            <Input id="askDataCapabilityId" value={cfg.askDataCapabilityId} onChange={(e) => set("askDataCapabilityId", e.target.value)} placeholder="(optional) capability id or key" />
          </Field>
          <Field label="Call Triage Capability" htmlFor="triageCapabilityId" help="Assesses a 997 call transcript into severity, protocol and dispatch (AICP Intelligence › Call Triage). Blank falls back to the Copilot capability.">
            <Input id="triageCapabilityId" value={cfg.triageCapabilityId} onChange={(e) => set("triageCapabilityId", e.target.value)} placeholder="(optional) capability id or key" />
          </Field>
          <Field label="Document-Chat Capability" htmlFor="documentChatCapabilityId" help="Answers questions grounded in the open document (talk-to-document in the Intelligence Centers). Blank falls back to the Copilot capability.">
            <Input id="documentChatCapabilityId" value={cfg.documentChatCapabilityId} onChange={(e) => set("documentChatCapabilityId", e.target.value)} placeholder="(optional) capability id or key" />
          </Field>
          <Field label="Reply-Draft Capability" htmlFor="replyDraftCapabilityId" help="Drafts a reply letter from an incoming letter + chosen intent (Correspondence Tracking). Blank falls back to the Copilot capability.">
            <Input id="replyDraftCapabilityId" value={cfg.replyDraftCapabilityId} onChange={(e) => set("replyDraftCapabilityId", e.target.value)} placeholder="(optional) capability id or key" />
          </Field>
        </FieldGroup>
      </Card>

      {/* Extra parameters / keys */}
      <Card className="space-y-5 p-5 sm:p-6">
        <FieldGroup
          title="Additional Parameters & Keys"
          description="Any other AICP connection parameters, variables or API keys. Mark sensitive values as secret to mask them."
        >
          <div className="space-y-3">
            {cfg.extra.length === 0 && (
              <p className="text-sm text-muted-foreground">No additional parameters yet.</p>
            )}
            {cfg.extra.map((e, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <Input
                  aria-label="Parameter name"
                  className="sm:w-1/3"
                  value={e.key}
                  onChange={(ev) => setExtra(i, { key: ev.target.value })}
                  placeholder="KEY / name"
                />
                <Input
                  aria-label="Parameter value"
                  className="flex-1"
                  type={e.secret && !shown.has(i) ? "password" : "text"}
                  value={e.value}
                  onFocus={() => {
                    // Clear the mask on focus so the operator can type a new secret.
                    if (e.secret && e.value === SECRET_MASK) setExtra(i, { value: "" });
                  }}
                  onChange={(ev) => setExtra(i, { value: ev.target.value })}
                  placeholder="value"
                />
                {e.secret && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={shown.has(i) ? "Hide value" : "Show value"}
                    title={shown.has(i) ? "Hide value" : "Show value"}
                    disabled={revealing === i}
                    onClick={() => (shown.has(i) ? setShownAt(i, false) : reveal(i))}
                  >
                    {revealing === i ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : shown.has(i) ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                )}
                <label className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={!!e.secret}
                    onChange={(ev) => setExtra(i, { secret: ev.target.checked })}
                    className="h-3.5 w-3.5 rounded border-border"
                  />
                  Secret
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove parameter"
                  onClick={() => removeExtra(i)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addExtra}>
            <Plus className="h-3.5 w-3.5" /> Add parameter
          </Button>
        </FieldGroup>
      </Card>

      {/* Save bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save} disabled={status.kind === "saving"}>
          {status.kind === "saving" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save configuration
        </Button>
        {status.kind === "saved" && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" /> Saved.
          </span>
        )}
        {status.kind === "error" && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-danger">
            <XCircle className="h-4 w-4" /> {status.message}
          </span>
        )}
      </div>
    </div>
  );
}
