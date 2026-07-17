/**
 * Seeded SRCA correspondence register for the Correspondence Tracking System reference (demo).
 * Records are simulated (as they would live in the customer's correspondence system); the AI over
 * them — triage, talk-to-letter, reply drafting — is genuinely AICP.
 */

export type Direction = "Incoming" | "Outgoing";
export type CorrStatus = "New" | "In Review" | "Routed" | "Replied" | "Closed";
export type Priority = "High" | "Medium" | "Low";
export type Channel = "Letter" | "Email" | "Fax";

export interface Correspondence {
  id: string;
  ref: string;
  subject: string;
  subjectAr: string;
  from: string;
  to: string;
  direction: Direction;
  status: CorrStatus;
  priority: Priority;
  channel: Channel;
  date: string;
  body: string;
}

export const CORRESPONDENCE: Correspondence[] = [
  {
    id: "c1",
    ref: "CORR-2026-0312",
    subject: "Complaint — prolonged water outage, Al-Nakheel district",
    subjectAr: "شكوى — انقطاع مياه مطوّل في حي النخيل",
    from: "Al-Nakheel Resident Committee",
    to: "SRCA — Community Relations",
    direction: "Incoming",
    status: "New",
    priority: "High",
    channel: "Email",
    date: "2026-02-03",
    body: `To the Saudi Red Crescent Authority — Community Relations.

Dear Sir/Madam,

We are writing on behalf of the Al-Nakheel resident committee regarding a prolonged water outage affecting more than 200 households for the past six days. Several elderly residents and families with infants are without running water, and we are concerned about health and hygiene risks.

We respectfully request: (1) urgent coordination with the relevant authorities to restore supply, (2) interim provision of drinking water to affected households, and (3) a point of contact for daily updates.

Please treat this as urgent. Contact: resident committee, ahmed@example.com, +966 55 111 2222.

Sincerely,
Ahmed Al-Otaibi, Committee Chair`,
  },
  {
    id: "c2",
    ref: "CORR-2026-0298",
    subject: "Inter-agency coordination — Hajj 2026 medical staging",
    subjectAr: "تنسيق مشترك — التمركز الطبي لحج 2026",
    from: "Ministry of Health — Emergency Directorate",
    to: "SRCA — Operations",
    direction: "Incoming",
    status: "In Review",
    priority: "High",
    channel: "Letter",
    date: "2026-01-29",
    body: `From: Ministry of Health, Emergency Directorate.
To: Saudi Red Crescent Authority, Operations.

Subject: Coordination of medical staging for the 2026 Hajj season.

We request confirmation of SRCA's ambulance and crew allocation for the Mashaer area, the location of field medical points, and the agreed escalation protocol for mass-casualty events. Kindly nominate a liaison officer and confirm participation in the joint planning workshop scheduled for 20 February 2026.

We look forward to your prompt confirmation.`,
  },
  {
    id: "c3",
    ref: "CORR-2026-0305",
    subject: "Hospital diversion notice — King Fahad Medical City at capacity",
    subjectAr: "إشعار تحويل — مدينة الملك فهد الطبية بلغت السعة",
    from: "King Fahad Medical City",
    to: "SRCA — Riyadh Command Center",
    direction: "Incoming",
    status: "Routed",
    priority: "High",
    channel: "Fax",
    date: "2026-02-01",
    body: `To: SRCA Riyadh Command Center.

This is a formal notice that King Fahad Medical City has reached emergency-department capacity as of 14:00 today. We request temporary diversion of non-critical cases to alternative facilities for the next 6 hours. Critical and time-sensitive cases (cardiac, stroke, major trauma) will continue to be accepted.

Please acknowledge and update your dispatch routing accordingly.`,
  },
  {
    id: "c4",
    ref: "CORR-2026-0281",
    subject: "Invoice dispute — maintenance service credits Q4",
    subjectAr: "نزاع فاتورة — رصيد خدمة الصيانة للربع الرابع",
    from: "Fleet Care Medical Services Co.",
    to: "SRCA — Procurement",
    direction: "Incoming",
    status: "In Review",
    priority: "Medium",
    channel: "Email",
    date: "2026-01-24",
    body: `To: SRCA Procurement Department.

Regarding invoice INV-2025-4471, we note a deduction of SAR 55,500 applied as service credits for the December availability shortfall. We respectfully dispute the calculation: our records show fleet availability of 91.4%, not 90.8% as stated, which would reduce the applicable credit.

We request a joint review of the availability logs and a corrected settlement. Please advise a suitable date.`,
  },
  {
    id: "c5",
    ref: "CORR-2026-0260",
    subject: "Letter of appreciation — volunteer flood response",
    subjectAr: "خطاب شكر — استجابة المتطوعين للسيول",
    from: "Governor's Office, Eastern Province",
    to: "SRCA — Volunteer Affairs",
    direction: "Incoming",
    status: "Replied",
    priority: "Low",
    channel: "Letter",
    date: "2026-01-18",
    body: `To the Saudi Red Crescent Authority.

On behalf of the Governorate of the Eastern Province, we extend our sincere appreciation for the exceptional efforts of your volunteers and crews during the recent flooding in Dammam and Jubail. Their rapid response and professionalism saved lives and provided comfort to affected families.

Please convey our gratitude to all involved.`,
  },
  {
    id: "c6",
    ref: "CORR-2026-0244",
    subject: "Request for first-aid training — municipal staff",
    subjectAr: "طلب تدريب إسعافات أولية — موظفو البلدية",
    from: "Riyadh Municipality — HR",
    to: "SRCA — Training Center",
    direction: "Incoming",
    status: "New",
    priority: "Medium",
    channel: "Email",
    date: "2026-01-15",
    body: `To: SRCA Training Center.

The Riyadh Municipality requests a proposal to deliver certified basic first-aid and CPR training for 150 field staff across three cohorts in Q2 2026. Please advise availability, curriculum, duration, certification, and cost, and whether on-site delivery at our facilities is possible.`,
  },
  {
    id: "c7",
    ref: "CORR-2026-0233",
    subject: "Internal circular — updated dispatch SOP v4.2",
    subjectAr: "تعميم داخلي — تحديث إجراء الإرسال 4.2",
    from: "SRCA — Operations Directorate",
    to: "All Regional Command Centers",
    direction: "Outgoing",
    status: "Closed",
    priority: "Medium",
    channel: "Email",
    date: "2026-01-08",
    body: `Internal Circular — to all Regional Command Centers.

Effective immediately, the 997 Emergency Dispatch SOP is updated to version 4.2. Key changes: nearest-unit dispatch by GPS (not station of origin), revised urban/rural response-time targets, and a structured on-scene status handover. All call-takers and dispatchers must complete the refresher module by 31 January 2026. Direct questions to the Operations Directorate.`,
  },
];

export function findCorrespondence(id: string): Correspondence | undefined {
  return CORRESPONDENCE.find((c) => c.id === id);
}
