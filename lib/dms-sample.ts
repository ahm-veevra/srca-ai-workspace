/**
 * Seeded SRCA document library for the Document Management System reference (demo).
 *
 * These represent records that would live in the customer's real DMS — the workspace treats them
 * as the enterprise system of record. The AI over them (talk-to-document, analyse) is genuinely
 * AICP; only the records themselves are simulated so the demo is realistic and self-contained.
 */

export type DocType = "Policy" | "Contract" | "Report" | "Memo" | "Protocol" | "Tender" | "Plan";
export type Classification = "Public" | "Internal" | "Confidential" | "Restricted";

export interface DmsDocument {
  id: string;
  title: string;
  titleAr: string;
  type: DocType;
  department: string;
  owner: string;
  /** ISO date the record was filed. */
  date: string;
  classification: Classification;
  sizeKb: number;
  pages: number;
  /** Extracted document text — what a viewer/OCR would surface and what AICP reasons over. */
  body: string;
}

export const DMS_DOCUMENTS: DmsDocument[] = [
  {
    id: "DOC-2026-0148",
    title: "Ambulance Fleet Maintenance Services Agreement",
    titleAr: "اتفاقية خدمات صيانة أسطول الإسعاف",
    type: "Contract",
    department: "Procurement & Logistics",
    owner: "Eng. Faisal Al-Harbi",
    date: "2026-01-14",
    classification: "Confidential",
    sizeKb: 486,
    pages: 12,
    body: `SERVICE AGREEMENT between the Saudi Red Crescent Authority ("SRCA") and Fleet Care Medical Services Co. ("Provider").

1. TERM. This Agreement runs for 24 months from 1 February 2026, auto-renewing for successive 12-month periods unless either party gives 90 days written notice before expiry.

2. SCOPE. The Provider shall perform scheduled preventive maintenance on 340 ambulances across the Riyadh, Makkah and Eastern regions, and provide emergency roadside repair within 4 hours of dispatch, 24/7.

3. SERVICE LEVELS. Fleet availability shall not fall below 92% in any calendar month. For each full percentage point below 92%, the Provider forfeits 3% of that month's fees as service credits.

4. PAYMENT. SRCA shall pay SAR 1,850,000 per quarter, in arrears, within 30 days of a valid invoice. Late payment accrues interest at 1% per month.

5. LIABILITY. The Provider's aggregate liability is capped at the fees paid in the preceding 12 months, except for gross negligence or breach of confidentiality, which are uncapped.

6. TERMINATION. Either party may terminate for material breach with a 30-day cure period. SRCA may terminate for convenience on 60 days notice.

7. CONFIDENTIALITY. Operational and patient-related data disclosed under this Agreement must be protected for 5 years post-termination and may not be sub-processed outside the Kingdom.`,
  },
  {
    id: "DOC-2026-0092",
    title: "997 Emergency Dispatch Standard Operating Procedure",
    titleAr: "الإجراء التشغيلي القياسي لإرسال الطوارئ 997",
    type: "Protocol",
    department: "Operations",
    owner: "Dr. Noura Al-Qahtani",
    date: "2026-01-06",
    classification: "Internal",
    sizeKb: 233,
    pages: 8,
    body: `997 EMERGENCY DISPATCH — STANDARD OPERATING PROCEDURE (v4.2)

PURPOSE. To standardise call-taking, triage and ambulance dispatch across all SRCA command centers.

1. CALL INTAKE. The call-taker confirms location, caller callback number, and chief complaint within the first 30 seconds. Location is verified against the GIS map before dispatch.

2. TRIAGE. Complaints are classified using the SRCA acuity scale: RED (immediately life-threatening — cardiac arrest, major trauma, airway), AMBER (urgent — chest pain, stroke signs, moderate trauma), GREEN (non-urgent). RED cases trigger immediate dispatch of the nearest available advanced unit.

3. DISPATCH TARGETS. Response-time targets: urban RED ≤ 8 minutes, rural RED ≤ 15 minutes. The dispatcher assigns the nearest unit by GPS, not by station of origin.

4. HANDOVER. On scene, crews transmit a structured status (En Route, On Scene, Transporting, At Hospital) so the command center maintains live situational awareness.

5. ESCALATION. Mass-casualty incidents (≥ 5 casualties) escalate to the regional duty manager and activate the disaster response plan.`,
  },
  {
    id: "DOC-2026-0161",
    title: "Q4 2025 Operational Performance Report",
    titleAr: "تقرير الأداء التشغيلي للربع الرابع 2025",
    type: "Report",
    department: "Executive Office",
    owner: "Mr. Abdullah Al-Otaibi",
    date: "2026-01-20",
    classification: "Internal",
    sizeKb: 1024,
    pages: 24,
    body: `Q4 2025 OPERATIONAL PERFORMANCE REPORT — SRCA

EXECUTIVE SUMMARY. SRCA handled 1,284,000 emergency calls in Q4 2025, a 6% increase year-on-year. Average urban response time improved to 8.4 minutes (from 9.1). SLA compliance reached 91%, short of the 94% target, driven by demand spikes during the Hajj season overflow and two severe-weather events in the Eastern region.

KEY METRICS. Ambulances in service: 312 average daily. Fleet utilisation: 78%. Hospital handover time: 17 minutes average (target 15). Patients assisted: 486,000. Critical cases: 63,000.

CHALLENGES. Crew fatigue rose in Riyadh evening shifts; overtime risk reached 72%. Hospital capacity in three referral centers exceeded 90% predicted occupancy, extending handover.

RECOMMENDATIONS. (1) Add two crews to the Riyadh evening shift. (2) Formalise a diversion protocol with the three saturated hospitals. (3) Accelerate the predictive-maintenance rollout to reduce unplanned fleet downtime.`,
  },
  {
    id: "DOC-2026-0177",
    title: "Regional Disaster Response Plan — Eastern Province",
    titleAr: "خطة الاستجابة للكوارث — المنطقة الشرقية",
    type: "Plan",
    department: "Emergency Preparedness",
    owner: "Dr. Khalid Al-Dossary",
    date: "2026-01-22",
    classification: "Restricted",
    sizeKb: 742,
    pages: 18,
    body: `REGIONAL DISASTER RESPONSE PLAN — EASTERN PROVINCE (2026)

1. ACTIVATION. This plan activates on declaration of a Level-2 or higher incident (industrial event, flood, mass-casualty transport incident) by the regional duty manager.

2. COMMAND. A unified command post is established within 45 minutes. SRCA coordinates with Civil Defense, the Ministry of Health, and the affected municipality.

3. RESOURCES. Surge capacity: 60 additional ambulances mobilisable within 2 hours from neighbouring regions. Two mobile field hospitals (50 beds each) are pre-staged in Dammam and Jubail.

4. TRIAGE. On-scene triage uses the START method. Casualties are colour-tagged and distributed across receiving hospitals per real-time capacity from the command center.

5. COMMUNICATIONS. Primary: TETRA radio. Backup: satellite. All units fall back to the regional talkgroup on cellular failure.

6. RECOVERY. Post-incident, a hot debrief is held within 24 hours and a formal after-action review within 14 days.`,
  },
  {
    id: "DOC-2026-0203",
    title: "Medical Consumables Framework Tender — Evaluation Summary",
    titleAr: "ملخص تقييم مناقصة المستهلكات الطبية",
    type: "Tender",
    department: "Procurement & Logistics",
    owner: "Ms. Sara Al-Zahrani",
    date: "2026-02-02",
    classification: "Confidential",
    sizeKb: 388,
    pages: 10,
    body: `MEDICAL CONSUMABLES FRAMEWORK TENDER (RFT-2026-014) — EVALUATION SUMMARY

SCOPE. A 3-year framework for the supply of medical consumables (airway, IV, wound care, PPE) to all SRCA regions, estimated at SAR 42 million annually.

MANDATORY REQUIREMENTS. (1) SFDA registration for all supplied items. (2) On-Kingdom warehousing with 48-hour replenishment. (3) Cold-chain compliance for temperature-sensitive items. (4) Local content ≥ 30% per Vision 2030.

BIDDERS. Four compliant bids received. Vendor A: lowest price, local content 22% (fails mandatory #4). Vendor B: price +6%, local content 41%, strongest logistics. Vendor C: price +9%, incomplete cold-chain evidence. Vendor D: withdrawn.

RECOMMENDATION. Award to Vendor B. Although not the lowest price, it is the only bid meeting all mandatory requirements with a compliant local-content ratio and the strongest replenishment SLA. Vendor A's non-compliance on local content disqualifies the lowest bid.`,
  },
  {
    id: "DOC-2026-0119",
    title: "Volunteer Programme Expansion — Internal Memo",
    titleAr: "مذكرة داخلية — توسعة برنامج المتطوعين",
    type: "Memo",
    department: "Human Resources",
    owner: "Mr. Yousef Al-Ghamdi",
    date: "2026-01-11",
    classification: "Internal",
    sizeKb: 96,
    pages: 3,
    body: `INTERNAL MEMO — VOLUNTEER PROGRAMME EXPANSION

TO: Regional HR Managers. FROM: Director of Human Capital. DATE: 11 January 2026.

SUBJECT. Expansion of the community first-responder volunteer programme ahead of the 2026 Hajj season.

We will grow the trained volunteer pool from 4,000 to 6,500 by the end of Q2 2026. Each volunteer completes the 40-hour basic life-support and mass-gathering curriculum and is credentialed on the SRCA volunteer platform.

ACTIONS. (1) Each region submits a recruitment target by 25 January. (2) Training cohorts start monthly from February. (3) Volunteers are insured and issued identification before any field deployment. (4) Retention: introduce a recognition programme and priority scheduling for returning volunteers.

Budget for the expansion (SAR 3.2M) is approved and allocated to regional training centers.`,
  },
  {
    id: "DOC-2026-0130",
    title: "Data Protection & Patient Confidentiality Policy",
    titleAr: "سياسة حماية البيانات وسرية المرضى",
    type: "Policy",
    department: "Legal & Compliance",
    owner: "Dr. Hana Al-Mutairi",
    date: "2026-01-15",
    classification: "Internal",
    sizeKb: 274,
    pages: 9,
    body: `DATA PROTECTION & PATIENT CONFIDENTIALITY POLICY (v3.0)

1. SCOPE. This policy governs the collection, processing, storage and disclosure of personal and health data across all SRCA systems and applies to employees, volunteers and contractors.

2. LAWFUL BASIS. Personal data is processed only for emergency response, quality assurance, and legal obligations, consistent with the Personal Data Protection Law (PDPL) of the Kingdom.

3. DATA SOVEREIGNTY. All personal and health data must be stored and processed within the Kingdom. Cross-border transfer is prohibited without explicit legal authorisation.

4. ACCESS CONTROL. Access to patient records follows least-privilege and clearance-based rules. Every access is logged and auditable.

5. RETENTION. Operational patient records are retained for 10 years, then securely destroyed. Audit logs are retained for 7 years and are immutable.

6. AI PROCESSING. Any AI system processing SRCA data must run on-premises under governance, must not retain data beyond the request, and must produce an auditable trace. Model providers must be sovereign.

7. BREACH. Suspected breaches are reported to the Data Protection Officer within 24 hours and to the regulator as required by the PDPL.`,
  },
];

/** Lookup helper. */
export function findDmsDocument(id: string): DmsDocument | undefined {
  return DMS_DOCUMENTS.find((d) => d.id === id);
}
