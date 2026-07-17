/** Plain-language learning content for the Learning Center. Pure data — no AI/runtime calls.
 * Tracks group short modules; each module links out to the real screen it describes. */

export interface LearnLink {
  label: string;
  href: string;
}

export interface LearnModule {
  title: string;
  body: string;
  points: string[];
  links?: LearnLink[];
}

export interface LearnTrack {
  key: string;
  title: string;
  description: string;
  modules: LearnModule[];
}

export const LEARNING_TRACKS: LearnTrack[] = [
  {
    key: "getting_started",
    title: "Getting Started",
    description: "The big picture — what the platform is and how to find your way around.",
    modules: [
      {
        title: "What AICP is",
        body:
          "AICP is an enterprise AI operating platform. Instead of wiring AI together " +
          "yourself, you choose a business outcome — like answering citizen questions or " +
          "processing documents — and the platform assembles the AI components needed, with " +
          "governance and audit built in.",
        points: [
          "You work in terms of outcomes (Solutions), not raw AI plumbing.",
          "Everything can run on-premises, fully under your control.",
          "Every AI action is governed and recorded for compliance.",
        ],
        links: [{ label: "Open the Solution Center", href: "/solutions" }],
      },
      {
        title: "Solutions vs Components",
        body:
          "A Solution is a complete business capability (e.g. a Knowledge Assistant). It is " +
          "built from Components — the building blocks like an AI model, a knowledge base or a " +
          "governance policy. You pick a Solution; the platform tells you which Components it " +
          "needs and how ready it is.",
        points: [
          "Solution = the outcome you want.",
          "Components = the parts that make it work.",
          "Readiness shows what's already configured and what's missing.",
        ],
        links: [{ label: "Browse solutions", href: "/solutions" }],
      },
      {
        title: "Personas and workspace depth",
        body:
          "Choose a persona (Business User, AI Engineer, Knowledge Manager, and so on) and the " +
          "platform tailors what you see. The Workspace switcher then lets you go deeper — " +
          "Simple shows business outcomes, Advanced adds AI administration, Architect reveals " +
          "the full technical surface.",
        points: [
          "Personas set a sensible starting depth and landing area.",
          "Simple mode hides technical screens you don't need.",
          "You can switch depth at any time from the sidebar.",
        ],
      },
    ],
  },
  {
    key: "first_solution",
    title: "Deploying Your First Solution",
    description: "From idea to a running capability — the fastest paths to deploy.",
    modules: [
      {
        title: "Solution Templates",
        body:
          "Templates are ready-made, scenario-tuned versions of a Solution — pre-configured for " +
          "a sector like Government or Banking. Pick the closest one and deploy in a click; " +
          "adjust the few defaults first if you want.",
        points: [
          "Fastest way to launch a working setup.",
          "Pre-set for a specific scenario, still adjustable.",
          "Deploys through the same safe, idempotent path as Solutions.",
        ],
        links: [{ label: "See templates", href: "/solution-templates" }],
      },
      {
        title: "Guided Setup",
        body:
          "Prefer a few plain questions? The Setup Wizard asks what you want to deploy, where it " +
          "should run and your safety and budget preferences, then assembles the configuration " +
          "for you and previews exactly what it will create before anything is applied.",
        points: [
          "Answer business questions, not technical ones.",
          "Preview the plan before it's applied.",
          "Nothing is written until you confirm.",
        ],
        links: [{ label: "Start guided setup", href: "/setup" }],
      },
      {
        title: "Try it safely with Demo Mode",
        body:
          "Demo Mode runs a real sample through your actual configured pipeline — recognition, " +
          "governance, routing and grounding — step by step. Nothing is saved, no model is " +
          "billed. It's the safe way to see how a Solution behaves before you rely on it.",
        points: [
          "Runs the real pipeline with a sample input.",
          "No data is persisted and no cost is incurred.",
          "Shows where governance would block or redact.",
        ],
        links: [{ label: "Open the Solution Center", href: "/solutions" }],
      },
    ],
  },
  {
    key: "knowledge",
    title: "Knowledge & Data",
    description: "Teach the platform what your organisation knows.",
    modules: [
      {
        title: "Knowledge Bases",
        body:
          "A Knowledge Base holds your documents in a form the AI can search by meaning. " +
          "Solutions like the Knowledge Assistant answer strictly from it, with citations, so " +
          "responses stay grounded in approved content.",
        points: [
          "Stores documents for meaning-based retrieval.",
          "Powers grounded, cited answers.",
          "Keeps the AI from inventing facts.",
        ],
        links: [{ label: "Manage knowledge bases", href: "/knowledge" }],
      },
      {
        title: "Document Intelligence",
        body:
          "Document Intelligence recognises text in scanned files, classifies them by type and " +
          "extracts key fields — with a confidence score. Low-confidence results are sent for " +
          "human review rather than trusted blindly.",
        points: [
          "Reads, classifies and extracts from documents.",
          "Confidence scoring flags uncertain results.",
          "Humans review the cases that need it.",
        ],
        links: [{ label: "Open Document Intelligence", href: "/ocr" }],
      },
      {
        title: "Connected Knowledge & Business Facts",
        body:
          "Connected Knowledge is a living map of the people, organisations and things your " +
          "organisation knows about and how they relate. You can state facts in plain language " +
          "('Jane Doe works for Acme Corp') and they become connected knowledge instantly — and " +
          "retrievable by the assistant.",
        points: [
          "State facts in plain language; no ontology needed.",
          "Facts join the knowledge graph and become searchable.",
          "Also builds automatically as documents are processed.",
        ],
        links: [{ label: "Open Connected Knowledge", href: "/graph" }],
      },
    ],
  },
  {
    key: "governance",
    title: "Governance & Trust",
    description: "Keep AI usage safe, compliant and provable.",
    modules: [
      {
        title: "Policies",
        body:
          "Policies decide what the AI may and may not do — protecting personal data, blocking " +
          "unsafe content and requiring approval where needed. They apply on the way in and the " +
          "way out of every AI request.",
        points: [
          "Protect PII and control content automatically.",
          "Applied to both inputs and outputs.",
          "Can require human approval for sensitive cases.",
        ],
        links: [{ label: "Manage policies", href: "/governance" }],
      },
      {
        title: "Review Queue & Audit",
        body:
          "When a policy holds a request, it lands in the Review Queue for a person to decide. " +
          "Every AI action — allowed, redacted or blocked — is written to an audit trail, so you " +
          "can always show what happened and why.",
        points: [
          "Held requests go to people, not a black box.",
          "Every step is recorded for compliance.",
          "Board-ready evidence of controlled AI use.",
        ],
        links: [
          { label: "Open the Review Queue", href: "/validation" },
          { label: "View audit logs", href: "/audit" },
        ],
      },
    ],
  },
];

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  { term: "Solution", definition: "A complete business capability you can deploy, built from components." },
  { term: "Component", definition: "A building block of a solution — a model, knowledge base, policy, and so on." },
  { term: "Template", definition: "A ready-made, scenario-tuned version of a solution you can deploy in one click." },
  { term: "Model", definition: "The AI engine that generates answers or embeddings. Can run on-premises." },
  { term: "Provider", definition: "Where a model is hosted — local (on-prem) or a cloud AI service." },
  { term: "Policy", definition: "A governance rule controlling what the AI may do, applied to inputs and outputs." },
  { term: "Knowledge Base", definition: "Your documents stored for meaning-based search, so answers stay grounded." },
  { term: "Grounding", definition: "Answering strictly from your own content, with citations, instead of guessing." },
  { term: "Embedding", definition: "A numeric representation of text that lets the platform search by meaning." },
  { term: "Decision Rule", definition: "A rule that picks which model handles a request based on its sensitivity and intent." },
  { term: "AI Instruction", definition: "A reusable instruction (prompt) that shapes how the AI responds." },
  { term: "Agent", definition: "An AI that completes multi-step tasks using tools, under governance and approvals." },
  { term: "Connected Knowledge", definition: "A map of entities and relationships drawn from your facts and documents." },
  { term: "Demo Mode", definition: "Runs a sample through the real pipeline with nothing saved and no cost." },
];
