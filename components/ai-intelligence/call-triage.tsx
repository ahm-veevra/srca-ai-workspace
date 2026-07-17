"use client";

import * as React from "react";
import { AlertTriangle, FileAudio, Loader2, PhoneCall, RotateCcw, Upload } from "lucide-react";

import { triageTranscriptAction } from "@/app/(portal)/ai-intelligence/actions";
import { Card } from "@/components/ui/card";
import { MarkdownView } from "@/components/ui/markdown";
import { apiUpload, ApiRequestError } from "@/lib/api-client";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { LineageButton } from "./lineage-button";

interface TranscribeResult {
  text: string;
  model?: string;
  language?: string | null;
}

interface Triage {
  severity?: string;
  protocol?: string;
  dispatch?: string;
  summary?: string;
}

/** Best-effort parse of a structured triage payload; returns null for free-text answers. */
function parseTriage(output: string): Triage | null {
  const cleaned = output.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  if (!cleaned.startsWith("{")) return null;
  try {
    const obj = JSON.parse(cleaned) as Record<string, unknown>;
    const pick = (k: string) => (typeof obj[k] === "string" ? (obj[k] as string) : undefined);
    const tri: Triage = {
      severity: pick("severity"),
      protocol: pick("protocol"),
      dispatch: pick("dispatch") ?? pick("recommended_dispatch"),
      summary: pick("summary") ?? pick("assessment"),
    };
    return tri.severity || tri.protocol || tri.dispatch || tri.summary ? tri : null;
  } catch {
    return null;
  }
}

function severityTone(sev?: string): string {
  switch ((sev ?? "").toLowerCase()) {
    case "critical":
    case "high":
    case "red":
      return "bg-danger/10 text-danger border-danger/30";
    case "medium":
    case "amber":
    case "yellow":
      return "bg-warning/10 text-warning border-warning/30";
    case "low":
    case "minor":
    case "green":
      return "bg-success/10 text-success border-success/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

type Stage = "idle" | "transcribing" | "assessing" | "done";

export function CallTriage({
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
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [stage, setStage] = React.useState<Stage>("idle");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [transcript, setTranscript] = React.useState<string | null>(null);
  const [detectedLang, setDetectedLang] = React.useState<string | null>(null);
  const [assessment, setAssessment] = React.useState<string | null>(null);
  const [triage, setTriage] = React.useState<Triage | null>(null);
  const [models, setModels] = React.useState<{ stt?: string; triage?: string }>({});
  const [error, setError] = React.useState<string | null>(null);

  const reset = () => {
    setStage("idle");
    setFileName(null);
    setTranscript(null);
    setDetectedLang(null);
    setAssessment(null);
    setTriage(null);
    setModels({});
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setFileName(file.name);
    setTranscript(null);
    setAssessment(null);
    setTriage(null);

    // 1) Transcribe via AICP (multipart; browser sets the boundary).
    setStage("transcribing");
    let text = "";
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiUpload<TranscribeResult>("/transcription/transcribe", form);
      text = (res.text ?? "").trim();
      setTranscript(text);
      setDetectedLang(res.language ?? null);
      setModels((m) => ({ ...m, stt: res.model }));
    } catch (err) {
      const detail = err instanceof ApiRequestError ? ` (${err.status})` : "";
      setError(`${t("ai.tri.errTranscribe")}${detail}`);
      setStage("idle");
      return;
    }
    if (!text) {
      setError(t("ai.tri.errTranscribe"));
      setStage("idle");
      return;
    }

    // 2) Assess the transcript with the triage capability.
    setStage("assessing");
    const res = await triageTranscriptAction(text, locale);
    if (res.ok) {
      setAssessment(res.output);
      setTriage(parseTriage(res.output));
      setModels((m) => ({ ...m, triage: res.model }));
    } else {
      setError(res.noCapability ? t("ai.tri.awaitingCap") : t("ai.tri.errAssess"));
    }
    setStage("done");
  };

  const busy = stage === "transcribing" || stage === "assessing";

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <PhoneCall className="h-5 w-5" />
        </span>
        <div className="flex-1 space-y-0.5">
          <h2 className="font-display text-lg font-semibold">{t("ai.tri.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("ai.tri.subtitle")}</p>
        </div>
        <div className="flex items-center gap-1">
          {stage !== "idle" && (
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {t("ai.tri.reset")}
            </button>
          )}
          <LineageButton
            icon="phone"
            sourceLabel={t("ai.lin.srcCapability")}
            rows={[
              {
                label: t("ai.lin.capability"),
                value: capabilityName
                  ? `${capabilityName}${capabilityId ? ` (${capabilityId.slice(0, 8)})` : ""}`
                  : capabilityId || "—",
              },
              { label: t("ai.lin.model"), value: [models.stt, models.triage].filter(Boolean).join(" · ") || t("ai.lin.modelAtRun") },
            ]}
            endpoints={[
              "/transcription/transcribe",
              ...(capabilityId ? [`/ai-capabilities/${capabilityId}/run`] : []),
            ]}
          />
        </div>
      </div>

      {!configured ? (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          {t("ai.tri.awaitingCap")}
        </p>
      ) : (
        <>
          {/* Uploader */}
          {stage === "idle" && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 p-6 text-center transition-colors hover:border-primary/50"
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium">{t("ai.tri.choose")}</span>
              <span className="max-w-xs text-xs text-muted-foreground">{t("ai.tri.uploadHint")}</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={onFile} />

          {/* File + progress */}
          {fileName && stage !== "idle" && (
            <div className="flex items-center gap-2 text-sm">
              <FileAudio className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate font-medium">{fileName}</span>
              {busy && (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {stage === "transcribing" ? t("ai.tri.transcribing") : t("ai.tri.assessing")}
                </span>
              )}
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          {/* Transcript */}
          {transcript && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="eyebrow">{t("ai.tri.transcript")}</p>
                {detectedLang && (
                  <span className="text-[11px] text-muted-foreground">
                    {t("ai.tri.detectedLang")}: {detectedLang}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap rounded-xl border border-border bg-surface-2 p-3 text-sm leading-relaxed">
                {transcript}
              </p>
            </div>
          )}

          {/* Assessment */}
          {assessment && (
            <div className="space-y-2">
              <p className="eyebrow">{t("ai.tri.assessment")}</p>
              {triage ? (
                <div className="space-y-2.5 rounded-xl border border-border bg-surface-2 p-4">
                  {triage.severity && (
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", severityTone(triage.severity))}>
                        <AlertTriangle className="h-3 w-3" /> {t("ai.tri.severity")}: {triage.severity}
                      </span>
                    </div>
                  )}
                  {triage.protocol && <Field label={t("ai.tri.protocol")} value={triage.protocol} />}
                  {triage.dispatch && <Field label={t("ai.tri.dispatch")} value={triage.dispatch} />}
                  {triage.summary && <p className="text-sm leading-relaxed text-foreground">{triage.summary}</p>}
                </div>
              ) : (
                <MarkdownView content={assessment} className="text-sm leading-relaxed text-foreground [word-break:break-word]" />
              )}
            </div>
          )}

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <AlertTriangle className="h-3 w-3" /> {t("ai.tri.disclaimer")}
          </p>
        </>
      )}
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="font-semibold text-foreground">{label}: </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
