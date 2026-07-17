"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import {
  ArrowRight,
  Check,
  FileSignature,
  FileText,
  FlaskConical,
  MessagesSquare,
  Rocket,
  ShieldCheck,
  Users,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfigWizard, type ConfigStep } from "@/components/config/config-wizard";
import type { CopilotNote } from "@/components/config/copilot";
import { apiGet, apiPatch, apiPost, ApiRequestError } from "@/lib/api-client";

// Business goals → an AI Capability shape (category + a starter objective + a tag). "Build My Own"
// starts blank. No technical component picking — the platform resolves the model by default and the
// objective becomes the capability's governed system prompt.
interface Blueprint {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  objective: string;
  tag: string;
}

const BLUEPRINTS: Blueprint[] = [
  { id: "assistant", title: "Enterprise Assistant", icon: MessagesSquare, category: "assistant",
    objective: "A governed assistant for staff, grounded in our own knowledge.", tag: "enterprise-chat" },
  { id: "document", title: "Document Helper", icon: FileText, category: "document",
    objective: "Read documents and answer questions about them or summarize them.", tag: "document-intelligence" },
  { id: "contract", title: "Contract Helper", icon: FileSignature, category: "document",
    objective: "Review contracts and surface key clauses, risks and obligations.", tag: "contract" },
  { id: "hr", title: "HR Assistant", icon: Users, category: "assistant",
    objective: "Answer employees' HR-policy questions clearly and accurately.", tag: "hr" },
  { id: "research", title: "Research Assistant", icon: FlaskConical, category: "knowledge",
    objective: "Search across our documents and synthesize concise answers.", tag: "research" },
  { id: "compliance", title: "Compliance Checker", icon: ShieldCheck, category: "governance",
    objective: "Check content against our policies and flag possible issues.", tag: "compliance" },
  { id: "custom", title: "Build My Own", icon: Wand2, category: "custom", objective: "", tag: "custom" },
];

interface Collection {
  id: string;
  key: string;
  name: string;
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);

export function BuildCapability() {
  const router = useRouter();

  const [blueprintId, setBlueprintId] = React.useState("assistant");
  const blueprint = BLUEPRINTS.find((b) => b.id === blueprintId) ?? BLUEPRINTS[0];
  const [name, setName] = React.useState("Enterprise Assistant");
  const [nameTouched, setNameTouched] = React.useState(false);
  const [objective, setObjective] = React.useState(BLUEPRINTS[0].objective);
  const [objectiveTouched, setObjectiveTouched] = React.useState(false);
  const [collections, setCollections] = React.useState<Collection[]>([]);
  const [picked, setPicked] = React.useState<Set<string>>(new Set());

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<{ id: string; name: string } | null>(null);

  // Knowledge grounding is optional and best-effort — a business user may not have access.
  React.useEffect(() => {
    apiGet<Collection[]>("/knowledge/collections").then(setCollections).catch(() => setCollections([]));
  }, []);

  function pickBlueprint(b: Blueprint) {
    setBlueprintId(b.id);
    if (!nameTouched) setName(b.title === "Build My Own" ? "" : b.title);
    if (!objectiveTouched) setObjective(b.objective);
  }

  const effectiveKey = slug(name);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const created = await apiPost<{ id: string }>("/ai-capabilities", {
        key: effectiveKey,
        name,
        description: objective,
        objective,
        category: blueprint.category,
        environment: "prod",
        document_types: [],
        ai_tasks: [],
        components: [...picked].map((k) => ({ type: "collection", key: k })),
        tags: [blueprint.tag].filter((t) => t && t !== "custom"),
      });
      // Make it visible and runnable under "My Capabilities" (best-effort — needs the toggle).
      try {
        await apiPatch(`/ai-capabilities/${created.id}`, { workspace_exposed: true });
      } catch {
        /* the capability still exists; an admin can expose it */
      }
      setDone({ id: created.id, name });
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Could not create the capability.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
            <Check className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">“{done.name}” is ready</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your capability was created and added to My Capabilities. Try it now, or refine it later.
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="accent" onClick={() => router.push(`/capabilities-run/${done.id}`)}>
              <Rocket className="h-4 w-4" /> Try it now
            </Button>
            <Button variant="outline" onClick={() => router.push("/capabilities-run")}>
              My Capabilities <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const context = {
    goal: blueprint.title,
    category: blueprint.category,
    knowledge_sources: picked.size,
  };

  const steps: ConfigStep[] = [
    {
      title: "What do you want to build?",
      description: "Pick the closest goal — we set sensible defaults you can edit.",
      valid: true,
      note: {
        explain:
          "Choose the business outcome you want. Each goal becomes a reusable AI Capability you and your team can run from My Capabilities — no technical setup required.",
        recommend: "Pick the closest fit; everything is editable next. Choose “Build My Own” to start from scratch.",
        bestPractices: ["A capability is governed automatically — every run goes through the platform's policy, audit and cost controls."],
        government: "For sensitive work, ground the capability on an approved knowledge base in the next steps and keep its objective specific.",
      },
      render: (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {BLUEPRINTS.map((b) => {
            const Icon = b.icon;
            const on = blueprintId === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => pickBlueprint(b)}
                className={`flex flex-col gap-1 rounded-lg border p-3 text-start transition-colors ${
                  on ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4 text-accent" /> {b.title}
                </span>
                {b.objective && <span className="text-xs text-muted-foreground">{b.objective}</span>}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Describe it",
      description: "Name it and say what it should do.",
      valid: name.trim().length > 0 && objective.trim().length > 0 && /^[a-z0-9][a-z0-9-]*$/.test(effectiveKey),
      note: {
        explain:
          "The name is how you'll find it; the objective tells the AI what it's for — it becomes the capability's governed instruction.",
        recommend: "Write the objective as a clear sentence: what it does and for whom. Be specific to get better answers.",
        bestPractices: [
          "Name it for the outcome, e.g. “HR Policy Assistant”.",
          "Avoid putting sensitive data in the objective — ground it on a knowledge base instead.",
        ],
      },
      render: (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => { setNameTouched(true); setName(e.target.value); }}
              placeholder="HR Policy Assistant"
            />
            {effectiveKey && <p className="text-xs text-muted-foreground">ID: {effectiveKey}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>What should it do?</Label>
            <textarea
              className="min-h-24 w-full rounded-md border border-border bg-background p-2 text-sm"
              value={objective}
              onChange={(e) => { setObjectiveTouched(true); setObjective(e.target.value); }}
              placeholder="Answer employees' HR-policy questions, grounded in our HR handbook."
            />
          </div>
        </div>
      ),
    },
    {
      title: "Knowledge",
      description: "What should it know about? (optional)",
      valid: true,
      note: {
        explain:
          "Ground the capability on your own knowledge bases so its answers cite your content instead of relying on general knowledge.",
        recommend: "Pick the knowledge base that holds the documents this capability should answer from. You can skip this for a general assistant.",
        bestPractices: ["Grounded capabilities are far more accurate and are less likely to make things up."],
        government: "Only ground on knowledge bases cleared for this capability's audience — the collection's access controls still apply at run time.",
      },
      render: (
        <div className="space-y-2">
          {collections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No knowledge bases are available to you. The capability will use general knowledge —
              you can ground it later.
            </p>
          ) : (
            collections.map((c) => {
              const on = picked.has(c.key);
              return (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-sm transition-colors ${
                    on ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setPicked((prev) => {
                        const n = new Set(prev);
                        if (n.has(c.key)) n.delete(c.key);
                        else n.add(c.key);
                        return n;
                      })
                    }
                  />
                  <span className="font-medium">{c.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{c.key}</span>
                </label>
              );
            })
          )}
        </div>
      ),
    },
    {
      title: "Review & create",
      description: "Confirm and build it.",
      valid: true,
      note: {
        explain: "Review your capability. On create, it's added to My Capabilities and ready to run — governed like everything else on the platform.",
        recommend: "Run it once after creating to confirm it behaves as you expect, then share it with your team.",
        bestPractices: ["You can refine the objective or knowledge later from the capability's page."],
      },
      render: (
        <dl className="grid grid-cols-[8rem_1fr] gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Goal</dt>
          <dd className="font-medium">{blueprint.title}</dd>
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-medium">{name || "—"}</dd>
          <dt className="text-muted-foreground">Objective</dt>
          <dd className="font-medium">{objective || "—"}</dd>
          <dt className="text-muted-foreground">Knowledge</dt>
          <dd className="font-medium">{picked.size ? [...picked].join(", ") : "general"}</dd>
        </dl>
      ),
    },
  ];

  return (
    <ConfigWizard
      title="Build a capability"
      area="AI capability"
      steps={steps}
      context={context}
      onFinish={create}
      onCancel={() => router.push("/capabilities-run")}
      finishing={busy}
      error={error}
      finishLabel="Create capability"
    />
  );
}
