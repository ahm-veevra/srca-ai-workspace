"use client";

import { AlertTriangle, Boxes, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { aicpHref } from "@/lib/aicp";
import { useT } from "@/lib/i18n";

type T = ReturnType<typeof useT>;

/** A DNS/connection failure to the model endpoint is a configuration problem, not a content one. */
function isConnectivityError(err: string | null): boolean {
  if (!err) return false;
  return /name or service not known|getaddrinfo|errno -?2|connection (refused|error|reset)|timed out|failed to establish|temporary failure in name resolution|nodename nor servname/i.test(
    err,
  );
}

/** The eight AICP dimensions behind a result — assembled by the backend from what the
 * pipeline actually recorded. A dimension that wasn't used is null (stated honestly). */
export interface Provenance {
  provider: { name: string; type: string } | null;
  model: { key: string; name: string; on_prem: boolean | null } | null;
  ocr: { pipeline?: string | null; engine?: string | null; confidence?: number | null } | null;
  knowledge: {
    collection: string | null;
    passages: number;
    /** Itemized citations that grounded the answer (which passages were used). */
    sources?: { title: string | null; chunk_id: string | null; score: number }[];
    /** Grounding confidence — top passage similarity (0–1). Absent for open generation. */
    confidence?: number | null;
  } | null;
  prompt: { label: string; template_key: string | null; version: number | null };
  agent: { key: string } | null;
  workflow: { key: string } | null;
  policies: {
    input: { action: string; guardrails: string[]; redactions: number };
    output: { action: string; guardrails: string[]; redactions: number };
  };
}

export interface AnalysisMeta {
  model: string | null;
  trace_id: string | null;
  status: string;
  policy_pre: string | null;
  policy_post: string | null;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  structured: boolean;
  raw_text: string | null;
  model_output?: string | null;
  error: string | null;
  route_rule?: string | null;
  route_reason?: string | null;
  fallbacks?: string[];
  sensitivity?: string | null;
  knowledge?: string | null;
  provenance?: Provenance | null;
}

/**
 * Business-first result transparency. By default it shows a simple, on-brand assurance line
 * ("Secure AI execution · Audited result · N verified sources"); the model, routing, tokens, cost,
 * trace and full provenance are demoted behind a "Technical details" disclosure. Errors are always
 * shown (in plain business language) so users are never left guessing.
 */
export function AnalysisMetaBar({ meta }: { meta: AnalysisMeta }) {
  const t = useT();
  const failed = meta.status === "blocked" || meta.status === "failed" || !!meta.error;
  const sources = meta.provenance?.knowledge?.sources?.length ?? 0;
  const hasTechnical = !!(meta.model || meta.provenance || meta.trace_id || meta.model_output);

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-surface-2/40 p-3 text-xs">
      {/* Business summary — the default, plain-language assurance line. */}
      {!failed && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-success" /> {t("sf.meta.secureExec")}
          </span>
          <span>· {t("sf.meta.audited")}</span>
          {sources > 0 && (
            <span>
              · {sources === 1 ? t("sf.meta.verifiedSource", { n: sources }) : t("sf.meta.verifiedSources", { n: sources })}
            </span>
          )}
        </div>
      )}

      {/* Errors — always shown, in plain business language. */}
      {failed ? (
        <div className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-2 text-danger">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {meta.status === "blocked" ? t("sf.meta.blocked") : t("sf.meta.failed")}
            {meta.error ? ` ${meta.error}` : ""}
            {meta.status !== "blocked" && !meta.model ? ` ${t("sf.meta.noService")}` : ""}
            {isConnectivityError(meta.error) ? ` ${t("sf.meta.connectivity")}` : ""}
          </span>
        </div>
      ) : !meta.structured && meta.raw_text ? (
        <div className="flex items-start gap-2 text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <span>{t("sf.meta.unstructured")}</span>
        </div>
      ) : !meta.structured && !meta.raw_text ? (
        <div className="flex items-start gap-2 text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <span>{t("sf.meta.empty")}</span>
        </div>
      ) : null}

      {/* Technical details — hidden by default (model, routing, tokens, trace, provenance). */}
      {hasTechnical && (
        <details className="rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5">
          <summary className="cursor-pointer select-none font-medium text-foreground">
            {t("sf.meta.technicalDetails")}
          </summary>
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {meta.model && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Boxes className="h-3 w-3" /> {meta.model}
                </Badge>
              )}
              {(meta.policy_pre || meta.policy_post) && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <ShieldCheck className="h-3 w-3" /> {t("sf.meta.policy")}: {meta.policy_pre ?? t("sf.meta.passed")}
                  {meta.policy_post ? ` / ${meta.policy_post}` : ""}
                </Badge>
              )}
              {meta.latency_ms != null && (
                <span className="text-muted-foreground">{Math.round(meta.latency_ms)} ms</span>
              )}
              {meta.input_tokens != null && (
                <span className="text-muted-foreground">
                  {t("sf.meta.tokensInOut", { in: meta.input_tokens ?? 0, out: meta.output_tokens ?? 0 })}
                </span>
              )}
              {meta.trace_id && (
                <a
                  href={aicpHref(`/requests/${meta.trace_id}`)}
                  className="text-primary hover:underline"
                >
                  {t("sf.meta.viewTrace")}
                </a>
              )}
            </div>
            {meta.provenance && <ProvenancePanel p={meta.provenance} />}
            {meta.model_output && (
              <div className="space-y-1">
                <p className="text-muted-foreground">{t("sf.meta.rawResponse")}</p>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded bg-surface-2/60 p-2 text-[11px] leading-relaxed">
                  {meta.model_output}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: ReactNode; muted?: boolean }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-x-2 py-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={muted ? "text-muted-foreground" : "text-foreground"}>{value}</dd>
    </div>
  );
}

function policyText(p: { action: string; guardrails: string[]; redactions: number }, t: T): string {
  const parts = [p.action];
  if (p.guardrails.length) parts.push(p.guardrails.join(", "));
  if (p.redactions) parts.push(p.redactions === 1 ? t("sf.prov.redaction", { n: p.redactions }) : t("sf.prov.redactions", { n: p.redactions }));
  return parts.join(" · ");
}

/** The full configuration provenance — every result names the exact AICP it ran through, so a
 * user can see how it was produced. Nothing is hidden; unused dimensions are stated as such. */
export function ProvenancePanel({ p }: { p: Provenance }) {
  const t = useT();
  return (
    <details className="rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5">
      <summary className="cursor-pointer select-none font-medium text-foreground">
        {t("sf.prov.howProduced")}
      </summary>
      <dl className="mt-1.5">
        <Row
          label={t("sf.prov.provider")}
          value={p.provider ? `${p.provider.name} (${p.provider.type})` : "—"}
          muted={!p.provider}
        />
        <Row
          label={t("sf.prov.model")}
          value={
            p.model
              ? `${p.model.name}${p.model.on_prem ? ` · ${t("sf.prov.onPrem")}` : ""}`
              : "—"
          }
          muted={!p.model}
        />
        <Row
          label={t("sf.prov.ocr")}
          value={
            p.ocr
              ? `${p.ocr.pipeline ?? p.ocr.engine ?? "pipeline"}${
                  p.ocr.confidence != null
                    ? ` · ${t("sf.prov.confidence", { n: Math.round(p.ocr.confidence * 100) })}`
                    : ""
                }`
              : t("sf.prov.notUsedText")
          }
          muted={!p.ocr}
        />
        <Row
          label={t("sf.prov.knowledge")}
          value={
            p.knowledge ? (
              <div className="space-y-1">
                <div>
                  {p.knowledge.collection ?? t("sf.prov.collection")} · {p.knowledge.passages === 1
                    ? t("sf.prov.passage", { n: p.knowledge.passages })
                    : t("sf.prov.passages", { n: p.knowledge.passages })}
                  {p.knowledge.confidence != null && (
                    <span className="text-muted-foreground">
                      {" "}· {t("sf.prov.grounding", { n: Math.round(p.knowledge.confidence * 100) })}
                    </span>
                  )}
                </div>
                {p.knowledge.sources && p.knowledge.sources.length > 0 && (
                  <ul className="space-y-0.5">
                    {p.knowledge.sources.map((s, i) => (
                      <li key={s.chunk_id ?? i} className="flex items-baseline gap-1.5 text-muted-foreground">
                        <span className="text-[10px]">[{i + 1}]</span>
                        <span className="truncate text-foreground">{s.title ?? t("sf.prov.untitled")}</span>
                        <span className="ms-auto shrink-0 text-[10px]">{t("sf.prov.match", { n: Math.round(s.score * 100) })}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              t("sf.prov.notUsedModel")
            )
          }
          muted={!p.knowledge}
        />
        <Row
          label={t("sf.prov.prompt")}
          value={`${p.prompt.label}${
            p.prompt.template_key
              ? ` · ${p.prompt.template_key}${p.prompt.version ? ` v${p.prompt.version}` : ""}`
              : ""
          }`}
        />
        <Row label={t("sf.prov.agent")} value={p.agent ? p.agent.key : t("sf.prov.notUsed")} muted={!p.agent} />
        <Row label={t("sf.prov.workflow")} value={p.workflow ? p.workflow.key : t("sf.prov.notUsed")} muted={!p.workflow} />
        <Row
          label={t("sf.prov.policies")}
          value={`${t("sf.prov.input")}: ${policyText(p.policies.input, t)} · ${t("sf.prov.output")}: ${policyText(p.policies.output, t)}`}
        />
      </dl>
    </details>
  );
}
