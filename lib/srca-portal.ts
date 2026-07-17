/**
 * SRCA intelligent intranet portal — First Aid Department / 997 Operations home.
 *
 * This landing page is oriented for the First Aid & Emergency Medical Services department that
 * runs the 997 emergency line: dispatchers, paramedics, field responders and operations officers.
 * Every tile maps to a live, AICP-governed route in this workspace — the portal never talks to a
 * model, OCR engine or knowledge store directly; it calls AICP over HTTP and every result is
 * governed and audited.
 *
 * Data-as-code so the home stays declarative. Names are bilingual (English + Arabic).
 */
import {
  Ambulance,
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  HeartPulse,
  type LucideIcon,
  Mail,
  MapPin,
  Megaphone,
  Plane,
  Radio,
  ShieldCheck,
  Siren,
  Sparkles,
  Users,
} from "lucide-react";

/** The department this portal is oriented for. */
export const DEPARTMENT = {
  name: "First Aid Department · 997 Operations",
  nameAr: "إدارة الإسعافات الأولية · عمليات ٩٩٧",
  short: "997 Operations",
};

export interface EnterpriseApp {
  key: string;
  name: string;
  /** Arabic name, shown under the English label as a bilingual cue. */
  nameAr: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

export interface AppGroup {
  key: string;
  label: string;
  labelAr: string;
  apps: EnterpriseApp[];
}

/** The First Aid / 997 application catalogue, grouped the way responders think about their work.
 * Every href is a live AICP-powered surface in this workspace. */
export const APP_GROUPS: AppGroup[] = [
  {
    key: "dispatch",
    label: "997 Operations & Dispatch",
    labelAr: "عمليات وإرسال ٩٩٧",
    apps: [
      {
        key: "command-997",
        name: "997 Command & Dispatch",
        nameAr: "القيادة والإرسال ٩٩٧",
        description: "Live incident board, call volumes and command briefings across the 997 centers.",
        icon: Siren,
        href: "/executive-intelligence",
      },
      {
        key: "fleet-readiness",
        name: "Ambulance & Crew Readiness",
        nameAr: "جاهزية الإسعاف والطواقم",
        description: "Ambulance availability, crew status and field deployments in real time.",
        icon: Ambulance,
        href: "/project-intelligence",
      },
      {
        key: "aeromedical",
        name: "Aeromedical / Air Ambulance",
        nameAr: "الإسعاف الجوي",
        description: "Air-ambulance coverage and the reach of every capability across the Kingdom.",
        icon: Plane,
        href: "/coverage",
      },
      {
        key: "handover",
        name: "Incident Reports & Handover",
        nameAr: "تقارير الحوادث والتسليم",
        description: "Shift handover notes and incident reports — drafted, summarized and routed.",
        icon: ClipboardList,
        href: "/correspondence-intelligence",
      },
    ],
  },
  {
    key: "clinical",
    label: "First Aid & Clinical",
    labelAr: "الإسعافات الأولية والإكلينيكي",
    apps: [
      {
        key: "protocols",
        name: "First Aid Protocols & Knowledge",
        nameAr: "بروتوكولات الإسعافات الأولية",
        description: "CPR, trauma and first-aid protocols — grounded, cited and instantly searchable.",
        icon: HeartPulse,
        href: "/knowledge-center",
      },
      {
        key: "epcr",
        name: "Patient Care Records (ePCR)",
        nameAr: "سجلات رعاية المرضى",
        description: "Capture and understand patient-care records, with high-accuracy Arabic OCR.",
        icon: FileText,
        href: "/document-intelligence",
      },
      {
        key: "hilal",
        name: "Ask Hilal — First-Aid Assistant",
        nameAr: "المساعد الذكي هلال",
        description: "Ask about protocols, dispatch, readiness and your tasks — grounded and governed.",
        icon: Sparkles,
        href: "/v-gpt",
      },
      {
        key: "quality",
        name: "Clinical Quality & Compliance",
        nameAr: "الجودة والالتزام الإكلينيكي",
        description: "Case reviews, quality checks and the governance behind every AI answer.",
        icon: ShieldCheck,
        href: "/compliance-intelligence",
      },
    ],
  },
  {
    key: "team",
    label: "Team & Support",
    labelAr: "الفريق والدعم",
    apps: [
      {
        key: "training",
        name: "Training & Certification",
        nameAr: "التدريب والاعتماد",
        description: "First Responder courses, recertification and readiness of your team.",
        icon: GraduationCap,
        href: "/learn",
      },
      {
        key: "roster",
        name: "Rostering & HR Services",
        nameAr: "الجداول والموارد البشرية",
        description: "Shifts, leave and instant HR answers for responders and volunteers.",
        icon: Users,
        href: "/hr-intelligence",
      },
      {
        key: "supplies",
        name: "Equipment & Medical Supplies",
        nameAr: "المعدات والمستلزمات الطبية",
        description: "Request and track ambulance equipment and medical consumables.",
        icon: Boxes,
        href: "/procurement-intelligence",
      },
      {
        key: "briefings",
        name: "Shift Briefings & Meetings",
        nameAr: "التحضيرات والاجتماعات",
        description: "Shift briefings and meetings — agendas, minutes and actions captured for you.",
        icon: CalendarDays,
        href: "/meeting-intelligence",
      },
    ],
  },
];

export interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
}

/** Fast paths surfaced right under the assistant prompt — the responder's most common moves. */
export const QUICK_ACTIONS: QuickAction[] = [
  { label: "First-aid protocols", icon: HeartPulse, href: "/knowledge-center" },
  { label: "Log a patient-care record", icon: FileText, href: "/document-intelligence" },
  { label: "Shift handover", icon: ClipboardList, href: "/correspondence-intelligence" },
  { label: "Ops briefing", icon: BarChart3, href: "/executive-intelligence" },
];

export interface Kpi {
  label: string;
  value: string;
  unit?: string;
  delta?: number;
  goodWhenUp?: boolean;
  spark: number[];
  icon: LucideIcon;
  href: string;
}

/** 997 operational snapshot. Illustrative figures for the portal home; in production each reads
 * from its connected system through AICP. */
export const KPIS: Kpi[] = [
  {
    label: "Active 997 calls · now",
    value: "37",
    delta: 12,
    spark: [22, 26, 24, 29, 31, 34, 37],
    icon: Radio,
    href: "/executive-intelligence",
  },
  {
    label: "Avg. response time",
    value: "8.4",
    unit: "min",
    delta: -4,
    goodWhenUp: false,
    spark: [9.6, 9.3, 9.0, 8.9, 8.7, 8.5, 8.4],
    icon: MapPin,
    href: "/executive-intelligence",
  },
  {
    label: "Ambulances available",
    value: "214",
    spark: [208, 202, 210, 205, 212, 209, 214],
    icon: Ambulance,
    href: "/project-intelligence",
  },
  {
    label: "Cases handled · today",
    value: "1,284",
    delta: 6,
    spark: [980, 1020, 1100, 1075, 1160, 1210, 1284],
    icon: HeartPulse,
    href: "/executive-intelligence",
  },
];

export interface Announcement {
  title: string;
  tag: string;
  when: string;
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    title: "Hajj 1447 first-aid & 997 deployment plan published",
    tag: "Operations",
    when: "2 days ago",
  },
  {
    title: "Updated adult CPR protocol (v4) now live in First Aid Knowledge",
    tag: "Clinical",
    when: "5 days ago",
  },
  {
    title: "997 dispatch console maintenance — Friday 02:00–03:00",
    tag: "Systems",
    when: "1 week ago",
  },
];

export interface PortalTask {
  title: string;
  meta: string;
  href: string;
  icon: LucideIcon;
}

export const MY_TASKS: PortalTask[] = [
  {
    title: "Acknowledge new CPR protocol (v4)",
    meta: "Clinical · due today",
    href: "/knowledge-center",
    icon: HeartPulse,
  },
  {
    title: "Complete shift handover — Riyadh sector",
    meta: "997 Ops · awaiting you",
    href: "/correspondence-intelligence",
    icon: ClipboardList,
  },
  {
    title: "Review ambulance readiness — Eastern region",
    meta: "Fleet · due today",
    href: "/project-intelligence",
    icon: Ambulance,
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * Operational intelligence — surfaced by AICP from the SRCA data lake.
 *
 * In production these read from the authority's data lake through governed AICP APIs (no direct
 * warehouse access from the portal). The figures below are an illustrative 997 snapshot so the
 * home reads like the real operational picture.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface RegionCalls {
  area: string;
  areaAr: string;
  calls: number;
}

/** 997 call volume by region today — answers "calls related to areas". */
export const CALLS_BY_REGION: RegionCalls[] = [
  { area: "Riyadh", areaAr: "الرياض", calls: 412 },
  { area: "Makkah", areaAr: "مكة المكرمة", calls: 356 },
  { area: "Jeddah", areaAr: "جدة", calls: 289 },
  { area: "Eastern Province", areaAr: "المنطقة الشرقية", calls: 241 },
  { area: "Madinah", areaAr: "المدينة المنورة", calls: 168 },
  { area: "Asir", areaAr: "عسير", calls: 121 },
];

export interface CaseType {
  label: string;
  labelAr: string;
  count: number;
  /** CSS var token for the bar colour, e.g. "--chart-1". */
  colorVar: string;
}

/** Case & accident mix today — answers "number of accidents" by type. */
export const CASE_MIX: CaseType[] = [
  { label: "Road traffic accidents", labelAr: "حوادث الطرق", count: 486, colorVar: "--chart-1" },
  { label: "Cardiac & chest pain", labelAr: "قلبية وألم صدري", count: 312, colorVar: "--chart-4" },
  { label: "Trauma & falls", labelAr: "إصابات وسقوط", count: 224, colorVar: "--chart-2" },
  { label: "Respiratory", labelAr: "تنفسية", count: 152, colorVar: "--chart-5" },
  { label: "Obstetric", labelAr: "ولادة وطوارئ نسائية", count: 63, colorVar: "--chart-3" },
  { label: "Other", labelAr: "أخرى", count: 47, colorVar: "--muted-foreground" },
];

/** 997 calls per hour over the last 24 hours — answers "emergency surfacing" over time.
 * Overnight lull, a morning rise and an evening peak. */
export const CALLS_24H: number[] = [
  18, 14, 11, 9, 8, 12, 21, 34, 47, 52, 58, 61,
  66, 63, 59, 55, 60, 71, 78, 74, 65, 51, 38, 27,
];

export const ANNOUNCEMENT_ICON = Megaphone;
export const NOTIFICATIONS_ICON = Bell;
