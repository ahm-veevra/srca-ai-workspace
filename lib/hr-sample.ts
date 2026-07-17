/**
 * Seeded SRCA HR register for the HR System reference (demo). Candidates (with CVs) and job
 * openings are simulated records; the AI over them — CV review, JD generation, ask-this-record —
 * is genuinely AICP.
 */

export type HrKind = "Candidate" | "Job";
export type HrStatus = "New" | "Screening" | "Shortlisted" | "Open" | "Interviewing" | "Closed";

export interface HrRecord {
  id: string;
  kind: HrKind;
  title: string;      // candidate name or job title
  titleAr: string;
  department: string;
  status: HrStatus;
  date: string;
  // Candidate fields
  appliedFor?: string;
  cvText?: string;
  reviewAgainst?: string; // job requirements to assess the CV against
  // Job fields
  seniority?: string;
  keyPoints?: string[];
  description?: string;
}

export const HR_RECORDS: HrRecord[] = [
  {
    id: "cand1",
    kind: "Candidate",
    title: "Sara Al-Harbi",
    titleAr: "سارة الحربي",
    department: "Emergency Medical Services",
    status: "Screening",
    date: "2026-02-03",
    appliedFor: "Paramedic (Senior)",
    reviewAgainst:
      "Senior Paramedic — SRCA. Requires a valid SRCA/SCFHS paramedic licence, 5+ years pre-hospital EMS, advanced life support (ALS), experience with mass-gathering events (e.g. Hajj), and Arabic + English communication.",
    cvText: `SARA AL-HARBI — Paramedic

Summary: Licensed paramedic with 7 years of pre-hospital emergency care in Riyadh and Makkah regions. Advanced Life Support certified. Experienced in high-volume mass-gathering operations during three Hajj seasons.

Experience:
- Senior Paramedic, Riyadh EMS (2021–present): lead medic on advanced units, 300+ critical interventions, mentored junior crews.
- Paramedic, Makkah Region (2019–2021): mass-gathering deployments, triage lead during Hajj 1441–1442.

Certifications: SCFHS Paramedic Licence, ACLS, PALS, PHTLS. Languages: Arabic (native), English (fluent).`,
  },
  {
    id: "cand2",
    kind: "Candidate",
    title: "Omar Al-Qahtani",
    titleAr: "عمر القحطاني",
    department: "997 Command Center",
    status: "Shortlisted",
    date: "2026-01-30",
    appliedFor: "Emergency Dispatcher",
    reviewAgainst:
      "Emergency Dispatcher — 997 Command Center. Requires 2+ years call-taking/dispatch, calm under pressure, GIS/CAD familiarity, structured triage protocols, and Arabic + English.",
    cvText: `OMAR AL-QAHTANI — Dispatch & Call Operations

Summary: Emergency call-taker and dispatcher with 4 years in a 24/7 command center environment. Strong at structured triage and multitasking under pressure.

Experience:
- Emergency Dispatcher, Regional Command Center (2022–present): handled 80+ calls/shift, GPS-based nearest-unit dispatch, CAD system.
- Call-taker, Utilities Helpdesk (2020–2022): escalation handling, SLA tracking.

Skills: CAD/GIS dispatch, structured triage, incident escalation. Languages: Arabic (native), English (good).`,
  },
  {
    id: "cand3",
    kind: "Candidate",
    title: "Layla Al-Mutairi",
    titleAr: "ليلى المطيري",
    department: "Operations Analytics",
    status: "New",
    date: "2026-02-05",
    appliedFor: "Operations Data Analyst",
    reviewAgainst:
      "Operations Data Analyst — SRCA. Requires SQL, dashboarding (BI), operational KPI analysis, and ideally healthcare/emergency-services data experience.",
    cvText: `LAYLA AL-MUTAIRI — Data Analyst

Summary: Data analyst with 3 years turning operational data into dashboards and decisions. Strong SQL and BI skills; no healthcare-sector experience yet.

Experience:
- Data Analyst, Logistics Company (2023–present): built KPI dashboards, SQL models, demand forecasting reports.
- Junior Analyst, Retail (2021–2023): sales reporting, Excel modelling.

Skills: SQL, Power BI, Python (pandas), KPI design. Languages: Arabic (native), English (fluent).`,
  },
  {
    id: "job1",
    kind: "Job",
    title: "Senior Paramedic",
    titleAr: "مسعف أول",
    department: "Emergency Medical Services",
    status: "Open",
    date: "2026-01-20",
    seniority: "Senior",
    keyPoints: [
      "Valid SCFHS paramedic licence and ALS certification",
      "5+ years pre-hospital emergency care",
      "Mass-gathering / Hajj operations experience",
      "Lead medic on advanced life support units",
      "Arabic and English communication",
    ],
    description:
      "SRCA is hiring a Senior Paramedic to lead advanced life support units, mentor crews, and support mass-gathering operations across the central and western regions.",
  },
  {
    id: "job2",
    kind: "Job",
    title: "Emergency Dispatcher",
    titleAr: "مُرسِل طوارئ",
    department: "997 Command Center",
    status: "Open",
    date: "2026-01-25",
    seniority: "Mid",
    keyPoints: [
      "2+ years call-taking / dispatch in a 24/7 environment",
      "Structured triage and nearest-unit dispatch (GIS/CAD)",
      "Calm and clear under pressure",
      "Arabic and English communication",
      "Willing to work rotating shifts",
    ],
    description:
      "SRCA is hiring Emergency Dispatchers for the 997 Command Center to take emergency calls, triage acuity, and dispatch the nearest available unit.",
  },
  {
    id: "job3",
    kind: "Job",
    title: "Procurement Officer",
    titleAr: "أخصائي مشتريات",
    department: "Procurement & Logistics",
    status: "Open",
    date: "2026-02-01",
    seniority: "Mid",
    keyPoints: [
      "3+ years public-sector or healthcare procurement",
      "Tender evaluation and vendor management",
      "Local-content and SFDA compliance awareness",
      "Contract drafting and negotiation",
      "Attention to detail and audit readiness",
    ],
    description:
      "SRCA is hiring a Procurement Officer to run tenders, evaluate bids, manage vendors and ensure compliant, cost-effective sourcing of medical and operational supplies.",
  },
];

export function findHrRecord(id: string): HrRecord | undefined {
  return HR_RECORDS.find((r) => r.id === id);
}
