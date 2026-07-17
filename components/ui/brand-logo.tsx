"use client";

import * as React from "react";
import { Plug } from "lucide-react";

import { RECOVERED_ICONS, VENDOR_ICONS, type VendorIcon } from "@/lib/generated/vendor-icons";

/**
 * Vendor Identity Standard — the ONE way third-party technologies appear in AICP.
 *
 * Every page renders vendors through this module; no surface hand-rolls logos:
 *   <BrandLogo vendor="onedrive" />                       — the mark alone
 *   <VendorLockup vendor="m365" label="Office 365" />     — [mark] name, the standard lockup
 *   detectBrand("Azure Document Intelligence (prod)")     — resolve brands inside free text
 *
 * Mark sources, in order of authority:
 *   1. VENDOR_ICONS  — generated from the MIT-licensed simple-icons package (official paths +
 *      brand hex; very dark brands emit currentColor so they invert correctly in dark mode).
 *   2. RECOVERED_ICONS — accurate paths recovered from this repo's own MIT/CC0 history assets
 *      for brands simple-icons removed under trademark policy (AWS, Salesforce, Oracle).
 *   3. CUSTOM        — hand-maintained flat marks: multi-colour brands (Microsoft squares,
 *      Slack pinwheel, Google Drive tricolour) and the Microsoft product family
 *      (OneDrive cloud, SharePoint, Teams, Outlook, Exchange, Azure sail), plus OpenAI.
 *   4. CHIPS         — brand-coloured monogram for wordmark-only brands (ServiceNow, D365, …).
 *   5. Fallback      — a neutral plug, a deterministic monogram, or nothing (caller's choice);
 *      the UI never breaks on an unknown vendor.
 */

type SvgMark = (props: { size: number }) => React.ReactElement;

// ── Hand-maintained multi-colour / trademark-policy marks ─────────────────────
const CUSTOM: Record<string, { title: string; mark: SvgMark }> = {
  microsoft: {
    title: "Microsoft",
    mark: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <rect x="1" y="1" width="10" height="10" fill="#F25022" />
        <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
        <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
        <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
      </svg>
    ),
  },
  // OneDrive's official logo IS a blue cloud — a flat cloud in OneDrive blue is faithful.
  onedrive: {
    title: "OneDrive",
    mark: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#0078D4"
          d="M12.1 6c2.65 0 4.93 1.66 5.82 4a4.8 4.8 0 0 1 4.58 4.79A4.72 4.72 0 0 1 17.79 19.5H6.42A4.92 4.92 0 0 1 1.5 14.6c0-2.44 1.79-4.47 4.13-4.85A6.26 6.26 0 0 1 12.1 6Z"
        />
      </svg>
    ),
  },
  sharepoint: {
    title: "SharePoint",
    mark: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <circle cx="10" cy="9.5" r="7.5" fill="#036C70" />
        <circle cx="17.5" cy="13.5" r="5.5" fill="#1A9BA1" />
        <circle cx="12" cy="18.5" r="4.5" fill="#37C6D0" />
        <text x="10" y="12.8" textAnchor="middle" fontSize="9.5" fontWeight="700"
              fontFamily="'Segoe UI',system-ui,sans-serif" fill="#fff">S</text>
      </svg>
    ),
  },
  teams: {
    title: "Microsoft Teams",
    mark: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <circle cx="17.5" cy="7.5" r="3.4" fill="#7B83EB" />
        <path fill="#7B83EB" d="M13.6 12h7.2c.66 0 1.2.54 1.2 1.2v4.3a4.5 4.5 0 0 1-4.5 4.5h-.4a4.7 4.7 0 0 1-3.5-1.58Z" />
        <rect x="2" y="6" width="12.5" height="12.5" rx="1.6" fill="#5059C9" />
        <text x="8.25" y="16" textAnchor="middle" fontSize="9.5" fontWeight="700"
              fontFamily="'Segoe UI',system-ui,sans-serif" fill="#fff">T</text>
      </svg>
    ),
  },
  outlook: {
    title: "Outlook",
    mark: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <path fill="#28A8EA" d="M12 4h9a1 1 0 0 1 1 1v3l-5.5 3L12 8Z" />
        <path fill="#0F6CBD" d="M12 8l4.5 3L22 8v10a1 1 0 0 1-1 1h-9Z" />
        <rect x="1" y="6" width="13" height="13" rx="1.6" fill="#0F6CBD" />
        <text x="7.5" y="16.4" textAnchor="middle" fontSize="10" fontWeight="700"
              fontFamily="'Segoe UI',system-ui,sans-serif" fill="#fff">O</text>
      </svg>
    ),
  },
  exchange: {
    title: "Exchange",
    mark: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <rect x="9" y="3" width="12" height="12" rx="1.4" fill="#28A8EA" />
        <rect x="2" y="9" width="13" height="13" rx="1.6" fill="#0F6CBD" />
        <text x="8.5" y="19.6" textAnchor="middle" fontSize="10" fontWeight="700"
              fontFamily="'Segoe UI',system-ui,sans-serif" fill="#fff">E</text>
      </svg>
    ),
  },
  // The Azure "sail" (pre-removal simple-icons geometry).
  azure: {
    title: "Microsoft Azure",
    mark: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <path fill="#0078D4" d="M5.483 21.3H24L14.025 4.013l-3.038 8.347 5.836 6.938L5.483 21.3zM13.23 2.7 6.105 8.677 0 19.253h4.05L13.23 2.7z" />
      </svg>
    ),
  },
  slack: {
    title: "Slack",
    mark: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <path fill="#36C5F0" d="M9 2.5a2 2 0 1 0 0 4h2v-2a2 2 0 0 0-2-2Z" />
        <path fill="#36C5F0" d="M9 8H4a2 2 0 1 0 0 4h5a2 2 0 1 0 0-4Z" />
        <path fill="#2EB67D" d="M22 9a2 2 0 1 0-4 0v2h2a2 2 0 0 0 2-2Z" />
        <path fill="#2EB67D" d="M16 9V4a2 2 0 1 0-4 0v5a2 2 0 1 0 4 0Z" />
        <path fill="#ECB22E" d="M15 22a2 2 0 1 0 0-4h-2v2a2 2 0 0 0 2 2Z" />
        <path fill="#ECB22E" d="M15 16h5a2 2 0 1 0 0-4h-5a2 2 0 1 0 0 4Z" />
        <path fill="#E01E5A" d="M2 15a2 2 0 1 0 4 0v-2H4a2 2 0 0 0-2 2Z" />
        <path fill="#E01E5A" d="M8 15v5a2 2 0 1 0 4 0v-5a2 2 0 1 0-4 0Z" />
      </svg>
    ),
  },
  googledrive: {
    title: "Google Drive",
    mark: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <path fill="#0066DA" d="m6.5 3 5.5 9.5H1z" transform="translate(1 2)" />
        <path fill="#00AC47" d="m1 12.5 3-5 5.5 9.5H4z" transform="translate(1 2)" />
        <path fill="#FFBA00" d="M9.5 12.5 6.5 3H17l-3 5z" transform="translate(1 2)" opacity="0.9" />
        <path fill="#EA4335" d="M14 8 9.5 16h9z" transform="translate(1 2)" />
      </svg>
    ),
  },
  // OpenAI's hexafoil knot (theme-aware via currentColor).
  openai: {
    title: "OpenAI",
    mark: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
        <path d="M21 10a5.4 5.4 0 0 0-.5-4.5 5.5 5.5 0 0 0-5.9-2.6A5.4 5.4 0 0 0 5.5 5.4 5.5 5.5 0 0 0 3.5 14a5.4 5.4 0 0 0 .5 4.5 5.5 5.5 0 0 0 5.9 2.6A5.4 5.4 0 0 0 18.5 18.6 5.5 5.5 0 0 0 21 10Zm-8.5 9.4a4 4 0 0 1-2.6-.9l3.9-2.2a.6.6 0 0 0 .3-.6v-5.3l1.7 1v4.4a4.1 4.1 0 0 1-3.3 3.6Zm-7-3.2a4 4 0 0 1-.5-2.7l3.9 2.3a.6.6 0 0 0 .6 0l4.6-2.7v1.9L8.5 19a4.1 4.1 0 0 1-3-2.8ZM4.6 8.5a4 4 0 0 1 2.1-1.8v4.5a.6.6 0 0 0 .3.6l4.6 2.6-1.7 1-4.1-2.3a4.1 4.1 0 0 1-1.2-4.6Zm12.9 3 -4.6-2.7 1.7-1 4.1 2.4a4 4 0 0 1-.6 7.2v-4.5a.6.6 0 0 0-.6-.5Zm1.7-2.5-3.9-2.3a.6.6 0 0 0-.6 0L10 7.4V5.5l4.1-2.4a4 4 0 0 1 5.8 4.4ZM9.1 12.5l-1.7-1V7.1a4 4 0 0 1 6.6-3.1L10.1 6.2a.6.6 0 0 0-.3.6Zm.9-2 2-1.2 2.1 1.2v2.4l-2.1 1.2-2-1.2Z" />
      </svg>
    ),
  },
  twilio: {
    title: "Twilio",
    mark: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="9.2" fill="none" stroke="#F22F46" strokeWidth="3.2" />
        <circle cx="9.2" cy="9.2" r="1.9" fill="#F22F46" />
        <circle cx="14.8" cy="9.2" r="1.9" fill="#F22F46" />
        <circle cx="9.2" cy="14.8" r="1.9" fill="#F22F46" />
        <circle cx="14.8" cy="14.8" r="1.9" fill="#F22F46" />
      </svg>
    ),
  },
};

// ── Wordmark-only brands → brand-coloured monogram chip ───────────────────────
const CHIPS: Record<string, { title: string; bg: string; label: string; fg?: string }> = {
  servicenow: { title: "ServiceNow", bg: "#62D84E", label: "SN", fg: "#032D42" },
  dynamics: { title: "Dynamics 365", bg: "#0B53CE", label: "D365" },
  sqlserver: { title: "SQL Server", bg: "#CC2927", label: "SQL" },
  cohere: { title: "Cohere", bg: "#39594D", label: "co" },
  groq: { title: "Groq", bg: "#F55036", label: "Gq" },
  docusign: { title: "DocuSign", bg: "#191823", label: "DS", fg: "#FFCC22" },
  alfresco: { title: "Alfresco", bg: "#8CC63F", label: "Al", fg: "#1B3409" },
  paddleocr: { title: "PaddleOCR", bg: "#2932E1", label: "PP" },
  tesseract: { title: "Tesseract OCR", bg: "#4A5568", label: "Ts" },
};

// ── Canonical key resolution ──────────────────────────────────────────────────
function norm(s?: string | null): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** alias (normalised) → canonical registry key. Longest aliases win in free-text detection. */
const ALIASES: Record<string, string> = {
  // Microsoft family
  microsoft: "microsoft", m365: "microsoft", microsoft365: "microsoft", office365: "microsoft",
  office: "microsoft", msgraph: "microsoft", microsoftgraph: "microsoft",
  onedrive: "onedrive", sharepoint: "sharepoint",
  teams: "teams", microsoftteams: "teams", msteams: "teams",
  outlook: "outlook", exchange: "exchange", exchangeonline: "exchange",
  azure: "azure", microsoftazure: "azure", azuread: "azure", entra: "azure", entraid: "azure",
  microsoftentra: "azure", microsoftentraid: "azure", azureopenai: "azure",
  azuredi: "azure", azuredocumentintelligence: "azure", azurevision: "azure",
  azureformrecognizer: "azure", microsoftonline: "azure",
  dynamics: "dynamics", dynamics365: "dynamics", sqlserver: "sqlserver", mssql: "sqlserver",
  // Google family
  google: "google", googleidentity: "google", googleworkspace: "google", gsuite: "google",
  gmail: "gmail", googledrive: "googledrive", gdrive: "googledrive",
  googlecalendar: "googlecalendar", googledocs: "googledocs",
  googlecloud: "googlecloud", gcp: "googlecloud", vertex: "googlecloud", vertexai: "googlecloud",
  googlevertex: "googlecloud", googlevision: "googlecloud", documentai: "googlecloud",
  googledocumentai: "googlecloud",
  gemini: "gemini", googlegemini: "gemini", googleai: "gemini",
  // AI providers
  openai: "openai", chatgpt: "openai", whisper: "openai", gpt: "openai",
  anthropic: "anthropic", claude: "anthropic",
  ollama: "ollama", mistral: "mistral", mistralai: "mistral", cohere: "cohere", groq: "groq",
  qwen: "qwen", tongyi: "qwen", llama: "meta", meta: "meta", metallama: "meta",
  huggingface: "huggingface",
  // AWS
  aws: "aws", amazonwebservices: "aws", bedrock: "aws", awsbedrock: "aws", amazonbedrock: "aws",
  textract: "aws", awstextract: "aws", amazontextract: "aws", amazons3: "aws",
  // Data platforms
  postgresql: "postgresql", postgres: "postgresql", mysql: "mysql", mongodb: "mongodb",
  oracle: "oracle", elasticsearch: "elasticsearch", qdrant: "qdrant",
  redis: "redis", rabbitmq: "rabbitmq", minio: "minio",
  // ECM / storage
  opentext: "opentext", documentum: "opentext", dropbox: "dropbox",
  alfresco: "alfresco",
  // Enterprise apps
  sap: "sap", s4hana: "sap", salesforce: "salesforce", sfdc: "salesforce",
  servicenow: "servicenow",
  // Developer platforms
  github: "github", gitlab: "gitlab",
  jira: "jira", jiracloud: "jira", atlassian: "jira", confluence: "confluence",
  // Identity
  okta: "okta", keycloak: "keycloak",
  // Communication
  slack: "slack", zoom: "zoom", webex: "webex", ciscowebex: "webex",
  twilio: "twilio", docusign: "docusign",
  // OCR engines
  tesseract: "tesseract", paddleocr: "paddleocr",
};

const ICONS: Record<string, VendorIcon> = { ...VENDOR_ICONS, ...RECOVERED_ICONS };

/** Normalise an exact vendor/kind/category value to a canonical brand key. */
export function brandKey(input?: string | null): string {
  const s = norm(input);
  return ALIASES[s] ?? s;
}

export function hasBrandLogo(input?: string | null): boolean {
  const k = brandKey(input);
  return k in CUSTOM || k in ICONS || k in CHIPS;
}

// Longest-first alias list so "azuredocumentintelligence" beats "azure".
const DETECT_KEYS = Object.keys(ALIASES).sort((a, b) => b.length - a.length);

/**
 * Find a known brand INSIDE free text ("Azure DI (prod)", "Corporate SharePoint",
 * "login.microsoftonline.com"). Returns the canonical key or null — grids with
 * user-authored names use this with a "none" fallback so unknown rows stay clean.
 * Aliases shorter than 4 chars are exact-match only ("box", "sap", "aws" would
 * otherwise false-positive inside ordinary words like "sandbox" or "flawship").
 */
export function detectBrand(text?: string | null): string | null {
  const s = norm(text);
  if (!s) return null;
  if (ALIASES[s]) return ALIASES[s];
  if (s in CUSTOM || s in ICONS || s in CHIPS) return s;
  for (const a of DETECT_KEYS) {
    if (a.length >= 4 && s.includes(a)) return ALIASES[a];
  }
  // Short names (SAP, AWS, Box, GCP, GPT) only match as whole words of the raw text —
  // "gpt" is bounded in "GPT-4o" but never inside ordinary words.
  const raw = (text || "").toLowerCase();
  for (const a of ["sap", "aws", "box", "gcp", "gpt"]) {
    if (new RegExp(`\\b${a}\\b`).test(raw)) return ALIASES[a] ?? a;
  }
  return null;
}

function displayTitle(key: string): string | undefined {
  return CUSTOM[key]?.title ?? ICONS[key]?.title ?? CHIPS[key]?.title;
}

// ── The mark ──────────────────────────────────────────────────────────────────
export function BrandLogo({
  vendor,
  size = 20,
  className = "",
  rounded = true,
  fallback = "plug",
}: {
  /** A connector kind, category, vendor name, or free text (resolved via brandKey/detectBrand). */
  vendor?: string | null;
  size?: number;
  className?: string;
  rounded?: boolean;
  /** What renders for an unknown vendor: a neutral plug, a deterministic monogram, or nothing. */
  fallback?: "plug" | "monogram" | "none";
}) {
  const key = hasBrandLogo(vendor) ? brandKey(vendor) : (detectBrand(vendor) ?? brandKey(vendor));
  const custom = CUSTOM[key];
  const icon = ICONS[key];
  const chip = CHIPS[key];
  const title = displayTitle(key) ?? vendor ?? undefined;
  const box = `inline-flex shrink-0 items-center justify-center ${rounded ? "rounded-md" : ""} ${className}`;
  const inner = Math.round(size * 0.82);

  if (custom) {
    return (
      <span role="img" aria-label={title} title={title} className={box}
            style={{ width: size, height: size }}>
        <custom.mark size={inner} />
      </span>
    );
  }
  if (icon) {
    return (
      <span role="img" aria-label={title} title={title} className={box}
            style={{ width: size, height: size }}>
        <svg width={inner} height={inner} viewBox="0 0 24 24" aria-hidden
             fill={icon.color === "currentColor" ? "currentColor" : icon.color}
             className={icon.color === "currentColor" ? "text-foreground" : undefined}>
          <path d={icon.path} />
        </svg>
      </span>
    );
  }
  if (chip) {
    return (
      <span
        role="img" aria-label={title} title={title}
        className={`${box} font-bold`}
        style={{ width: size, height: size, background: chip.bg, color: chip.fg ?? "#fff",
                 fontSize: Math.max(7, Math.round(size * (chip.label.length > 2 ? 0.3 : 0.42))) }}
      >
        {chip.label}
      </span>
    );
  }
  if (fallback === "none" || !vendor) {
    return null;
  }
  if (fallback === "monogram") {
    const initials = vendor.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    let h = 0;
    for (const ch of vendor) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return (
      <span role="img" aria-label={vendor} title={vendor}
            className={`${box} font-semibold text-white`}
            style={{ width: size, height: size, fontSize: size * 0.42,
                     background: `hsl(${h} 55% 42%)` }}>
        {initials}
      </span>
    );
  }
  return (
    <span role="img" aria-label={vendor} title={vendor}
          className={`${box} bg-surface-3 text-muted-foreground`}
          style={{ width: size, height: size }}>
      <Plug style={{ width: Math.round(size * 0.6), height: Math.round(size * 0.6) }} />
    </span>
  );
}

// ── The standard lockup: [mark] Name ──────────────────────────────────────────
export function VendorLockup({
  vendor,
  label,
  size = 18,
  className = "",
  fallback = "none",
}: {
  /** Brand source — a kind/key or free text; defaults to `label` when omitted. */
  vendor?: string | null;
  /** Visible text. Defaults to the brand's official title. */
  label?: string | null;
  size?: number;
  className?: string;
  fallback?: "plug" | "monogram" | "none";
}) {
  const source = vendor ?? label;
  const key = hasBrandLogo(source) ? brandKey(source) : detectBrand(source);
  const text = label ?? (key ? displayTitle(key) : null) ?? source ?? "";
  const known = !!key && !!displayTitle(key);
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      {(known || fallback !== "none") && <BrandLogo vendor={source} size={size} fallback={fallback} />}
      <span className="truncate">{text}</span>
    </span>
  );
}
