/**
 * Seeded SRCA executive-reporting register for the Executive System reference (demo). Raw reports
 * are simulated records; AICP turns each into a polished executive briefing (summary, highlights,
 * metrics, risks, recommendations, outlook). Talk-to-record is genuinely AICP.
 */

export type ExecStatus = "Draft" | "In Review" | "Final";

export interface ExecRecord {
  id: string;
  title: string;
  titleAr: string;
  period: string;
  department: string;
  status: ExecStatus;
  date: string;
  body: string;
}

export const EXEC_RECORDS: ExecRecord[] = [
  {
    id: "ex1",
    title: "Q4 2025 Board Pack — Operations Input",
    titleAr: "حزمة المجلس للربع الرابع 2025 — مدخلات العمليات",
    period: "Q4 2025",
    department: "Executive Office",
    status: "Final",
    date: "2026-01-20",
    body: `SRCA OPERATIONS — Q4 2025 (raw input for the board pack)

Calls handled: 1,284,000 (+6% YoY). Average urban response time: 8.4 min (was 9.1). SLA compliance: 91% vs 94% target. Patients assisted: 486,000. Critical cases: 63,000. Ambulances in service: 312/day average. Fleet utilisation: 78%. Hospital handover: 17 min (target 15).

Drivers: SLA gap from Hajj overflow and two Eastern-region weather events. Crew fatigue rose in Riyadh evenings (overtime risk 72%). Three referral hospitals exceeded 90% predicted occupancy.

Initiatives: predictive-maintenance pilot started; volunteer pool expansion underway; diversion protocol drafted with saturated hospitals.`,
  },
  {
    id: "ex2",
    title: "January 2026 Monthly Operations Report",
    titleAr: "تقرير العمليات الشهري — يناير 2026",
    period: "January 2026",
    department: "Operations",
    status: "In Review",
    date: "2026-02-02",
    body: `MONTHLY OPERATIONS REPORT — JANUARY 2026

Calls: 431,000 (+4% MoM). Response time held at 8.3 min. SLA 92%. Two mass-casualty incidents managed within protocol. Fleet availability averaged 79%.

Wins: diversion protocol went live with three Riyadh hospitals, cutting handover delays. Predictive maintenance flagged and prevented two fleet failures.

Watch items: dispatcher staffing short two crews on north evening sector; oxygen supply contract expiring in March needs a replacement tender.`,
  },
  {
    id: "ex3",
    title: "Regional Performance Summary — Eastern Province",
    titleAr: "ملخص الأداء الإقليمي — المنطقة الشرقية",
    period: "Q4 2025",
    department: "Eastern Region",
    status: "Final",
    date: "2026-01-15",
    body: `EASTERN PROVINCE — PERFORMANCE SUMMARY (Q4 2025)

Calls: 241,000. Response time: 9.6 min (above the 8-min urban target in Dammam/Jubail). Two flood events required disaster-plan activation; 60 surge ambulances mobilised. Volunteer response was praised by the Governorate.

Gaps: response time above target in two cities; field-hospital pre-staging worked but communications fell back to satellite twice on cellular failure.`,
  },
  {
    id: "ex4",
    title: "Annual Readiness Review — Draft",
    titleAr: "المراجعة السنوية للجاهزية — مسودة",
    period: "2025",
    department: "Emergency Preparedness",
    status: "Draft",
    date: "2026-02-05",
    body: `ANNUAL READINESS REVIEW 2025 (draft)

Operational readiness index averaged 88/100. Fleet readiness 84, hospital coordination improving, communications resilience the weakest dimension. Hajj 2025 handled without major incident. Predictive analytics now informing crew and fleet planning.

Priorities for 2026: close the SLA gap to 94%, harden communications against cellular failure, scale the volunteer pool to 6,500, and formalise AI-governance reporting to the board.`,
  },
];

export function findExecRecord(id: string): ExecRecord | undefined {
  return EXEC_RECORDS.find((r) => r.id === id);
}
