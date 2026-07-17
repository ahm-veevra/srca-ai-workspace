"use client";

import * as React from "react";

import type { Correspondence, Seal } from "@/lib/correspondence-sample";

/**
 * Renders a correspondence record as a realistic Saudi official letter: letterhead
 * (بسم الله، Kingdom of Saudi Arabia, issuing entity + department), a reference/date block
 * (Hijri + Gregorian), addressee, salutation, subject, body, closing, a signatory block and an
 * official seal. Labels follow the LETTER's language (not the UI locale), and Arabic letters render
 * RTL in the Arabic font — so it reads like the real document regardless of the app's language.
 */

const LABELS = {
  ar: {
    basmala: "بسم الله الرحمن الرحيم",
    kingdom: "المملكة العربية السعودية",
    ref: "الرقم",
    date: "التاريخ",
    corresponding: "الموافق",
    hijriSuffix: "",
    gregSuffix: "م",
    attachments: "المرفقات",
    subject: "الموضوع",
    salutation: "السلام عليكم ورحمة الله وبركاته،",
    closing: "وتفضلوا بقبول وافر التحية والتقدير،،،",
  },
  en: {
    basmala: "In the Name of Allah, the Most Gracious, the Most Merciful",
    kingdom: "Kingdom of Saudi Arabia",
    ref: "Ref.",
    date: "Date",
    corresponding: "",
    hijriSuffix: "",
    gregSuffix: "",
    attachments: "Attachments",
    subject: "Subject",
    salutation: "",
    closing: "Yours faithfully,",
  },
} as const;

/** The SRCA red-crescent emblem (letterhead logo). Drawn as an SVG so it needs no external asset. */
function SrcaLogo({ size = 58 }: { size?: number }) {
  const red = "#c1121f";
  const paper = "#fbf9f2";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Saudi Red Crescent Authority">
      {/* red crescent (opening faces left, bulge on the right — the Red Crescent emblem) */}
      <circle cx="53" cy="50" r="38" fill={red} />
      <circle cx="37" cy="49" r="31" fill={paper} />
    </svg>
  );
}

/** A stamped official seal (SRCA red crescent, or a green government star). */
function OfficialSeal({ kind, size = 66 }: { kind?: Seal; size?: number }) {
  if (!kind || kind === "none") return null;
  const color = kind === "crescent" ? "#c1121f" : "#0b6b3a";
  const paper = "#fbf9f2";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden
      style={{ transform: "rotate(-8deg)", opacity: 0.85 }}
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="2.5" />
      <circle cx="50" cy="50" r="39" fill="none" stroke={color} strokeWidth="1" />
      {/* tick marks around the ring */}
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const r1 = 39, r2 = 42;
        return (
          <line
            key={i}
            x1={50 + r1 * Math.cos(a)} y1={50 + r1 * Math.sin(a)}
            x2={50 + r2 * Math.cos(a)} y2={50 + r2 * Math.sin(a)}
            stroke={color} strokeWidth="0.8"
          />
        );
      })}
      {kind === "crescent" ? (
        <g>
          <circle cx="50" cy="50" r="19" fill={color} />
          <circle cx="57" cy="45" r="15.5" fill={paper} />
          <path d="M63 41 l2.2 4 4.4 .3 -3.4 2.9 1.1 4.3 -3.8-2.4 -3.8 2.4 1.1-4.3 -3.4-2.9 4.4-.3 z" fill={color} />
        </g>
      ) : (
        <path
          d="M50 30 l4.6 13.9 14.6 .1 -11.8 8.7 4.4 14 -11.8-8.5 -11.8 8.5 4.4-14 -11.8-8.7 14.6-.1 z"
          fill={color}
        />
      )}
    </svg>
  );
}

export function LetterView({
  item,
  bodyOverride,
  plainBody = false,
}: {
  item: Correspondence;
  /** Render this text as the body instead of `item.body` (used for the reply draft). */
  bodyOverride?: string;
  /** Skip the auto recipient/salutation/subject/closing — for drafts that already contain their own. */
  plainBody?: boolean;
}) {
  const body = bodyOverride ?? item.body;
  // Uploaded/ad-hoc letters have no official block — detect direction from the text and show a plain page.
  const detectedAr = /[؀-ۿ]/.test(body);
  const ar = item.official ? item.lang === "ar" : detectedAr;
  const L = LABELS[ar ? "ar" : "en"];
  const o = item.official;
  const chrome = !plainBody;

  const paperStyle: React.CSSProperties = {
    backgroundColor: "#fbf9f2",
    color: "#1a1a1a",
    ...(ar ? { fontFamily: "var(--font-arabic), 'Segoe UI', sans-serif" } : {}),
  };

  return (
    <div className="mx-auto max-w-2xl" dir={ar ? "rtl" : "ltr"}>
      <article
        className="overflow-hidden rounded-lg shadow-[0_10px_40px_-12px_rgba(0,0,0,0.5)] ring-1 ring-black/10"
        style={paperStyle}
      >
        {/* ── Letterhead ─────────────────────────────────────────────── */}
        <header className="border-b-2 px-8 pt-6 pb-4" style={{ borderColor: "#c1121f" }}>
          <p className="text-center text-[12px] font-semibold" style={{ color: "#6b6b6b" }}>{L.basmala}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex h-16 w-16 items-center justify-center">
              {o?.seal === "crescent" ? <SrcaLogo /> : <OfficialSeal kind={o?.seal} />}
            </div>
            <div className="flex-1 text-center leading-tight">
              <p className="text-[14px] font-bold">{L.kingdom}</p>
              {o && <p className="mt-0.5 text-[13px] font-bold" style={{ color: "#c1121f" }}>{o.entity}</p>}
              {o?.department && <p className="mt-0.5 text-[11px]" style={{ color: "#555" }}>{o.department}</p>}
            </div>
            <div className="h-16 w-16" />
          </div>
        </header>

        {/* ── Reference / date block ─────────────────────────────────── */}
        {o && (
          <div
            className="flex flex-wrap justify-between gap-x-6 gap-y-1 px-8 pt-4 text-[11.5px]"
            style={{ color: "#444" }}
          >
            <span>{L.ref}: <span className="font-semibold tabular-nums" dir="ltr">{item.ref}</span></span>
            <span>
              {L.date}:{" "}
              {ar && o.hijri ? (
                <>
                  <span className="font-semibold">{o.hijri}</span>
                  <span> {L.corresponding} </span>
                  <span className="font-semibold tabular-nums" dir="ltr">{item.date}</span>
                  <span>{L.gregSuffix}</span>
                </>
              ) : (
                <span className="font-semibold tabular-nums" dir="ltr">{item.date}</span>
              )}
            </span>
            {o.attachments ? (
              <span>{L.attachments}: <span className="font-semibold tabular-nums">{o.attachments}</span></span>
            ) : null}
          </div>
        )}

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="px-8 py-6 text-[13px]" style={{ lineHeight: 2 }}>
          {o && chrome && <p className="font-bold">{o.recipient}</p>}
          {chrome && L.salutation && <p className="mt-2">{L.salutation}</p>}
          {chrome && (
            <p className="mt-4">
              <span className="font-bold">{L.subject}: </span>
              {ar ? item.subjectAr : item.subject}
            </p>
          )}
          <div className={chrome ? "mt-3 whitespace-pre-wrap" : "whitespace-pre-wrap"} style={{ lineHeight: 2 }}>{body}</div>
          {o && chrome && <p className="mt-6">{L.closing}</p>}
        </div>

        {/* ── Signature + stamp ──────────────────────────────────────── */}
        {o && (
          <div className="px-8 pb-8 pt-2 text-end">
            <div className="inline-flex flex-col items-center">
              <p className="text-[12.5px] font-bold">{o.signatory}</p>
              <p className="mt-0.5 text-[11px]" style={{ color: "#555" }}>{o.signatoryTitle}</p>
              <div className="mt-1 opacity-90"><OfficialSeal kind={o.seal} size={54} /></div>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
