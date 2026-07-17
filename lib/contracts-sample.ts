/**
 * Seeded SRCA contract & tender register for the Contract & Tender Management reference (demo).
 * Records are simulated (as they'd live in the customer's contract/tender system); the AI over them —
 * clause/obligation analysis, compliance evaluation, talk-to-record — is genuinely AICP.
 */

export type RecordKind = "Contract" | "Tender";
export type RecordStatus = "Active" | "Under Review" | "Awarded" | "Expiring" | "Draft";

export interface ContractRecord {
  id: string;
  ref: string;
  title: string;
  titleAr: string;
  kind: RecordKind;
  counterparty: string;
  department: string;
  owner: string;
  value: string;
  status: RecordStatus;
  date: string;
  expiry?: string;
  body: string;
}

export const CONTRACT_RECORDS: ContractRecord[] = [
  {
    id: "ct1",
    ref: "CT-2026-0011",
    title: "Ambulance Fleet Maintenance Services Agreement",
    titleAr: "اتفاقية خدمات صيانة أسطول الإسعاف",
    kind: "Contract",
    counterparty: "Fleet Care Medical Services Co.",
    department: "Procurement & Logistics",
    owner: "Eng. Faisal Al-Harbi",
    value: "SAR 7.4M / year",
    status: "Active",
    date: "2026-01-14",
    expiry: "2028-01-31",
    body: `SERVICE AGREEMENT between the Saudi Red Crescent Authority ("SRCA") and Fleet Care Medical Services Co. ("Provider").

Term: 24 months from 1 February 2026, auto-renewing for successive 12-month periods unless either party gives 90 days written notice before expiry.

Scope: scheduled preventive maintenance on 340 ambulances across Riyadh, Makkah and Eastern regions; emergency roadside repair within 4 hours, 24/7.

Service levels: fleet availability shall not fall below 92% in any calendar month. For each full percentage point below 92%, the Provider forfeits 3% of that month's fees as service credits.

Payment: SAR 1,850,000 per quarter, in arrears, within 30 days of a valid invoice. Late payment accrues 1% per month.

Liability: the Provider's aggregate liability is capped at the fees paid in the preceding 12 months, except for gross negligence or breach of confidentiality, which are uncapped.

Termination: either party may terminate for material breach with a 30-day cure period; SRCA may terminate for convenience on 60 days notice.

Confidentiality: operational and patient-related data must be protected for 5 years post-termination and may not be sub-processed outside the Kingdom.`,
  },
  {
    id: "ct2",
    ref: "CT-2026-0024",
    title: "Medical Oxygen Supply Contract",
    titleAr: "عقد توريد الأكسجين الطبي",
    kind: "Contract",
    counterparty: "Sahara Medical Gases Co.",
    department: "Procurement & Logistics",
    owner: "Ms. Sara Al-Zahrani",
    value: "SAR 2.1M / year",
    status: "Expiring",
    date: "2024-03-01",
    expiry: "2026-03-15",
    body: `SUPPLY CONTRACT for medical oxygen between SRCA and Sahara Medical Gases Co.

Term: 24 months, expiring 15 March 2026. Renewal is not automatic and requires a new agreement.

Scope: supply and delivery of medical-grade oxygen cylinders to 42 SRCA stations, with a guaranteed 24-hour replenishment SLA and monthly safety inspection of regulators.

Pricing: fixed unit price for the term; a price review is permitted only on renewal. Volume discount of 5% above 10,000 cylinders per quarter.

Safety: the Supplier certifies SFDA compliance and cold-chain-independent handling. Any safety incident must be reported within 2 hours.

Note: this contract expires within 30 days. A replacement tender or renewal must be initiated to avoid a supply gap.`,
  },
  {
    id: "ct3",
    ref: "CT-2026-0009",
    title: "Headquarters Facilities Management Agreement",
    titleAr: "اتفاقية إدارة مرافق المقر الرئيسي",
    kind: "Contract",
    counterparty: "Prime Facilities Co.",
    department: "Administration",
    owner: "Mr. Yousef Al-Ghamdi",
    value: "SAR 3.6M / year",
    status: "Under Review",
    date: "2025-12-20",
    body: `FACILITIES MANAGEMENT AGREEMENT for the SRCA headquarters between SRCA and Prime Facilities Co.

Scope: hard and soft FM services — HVAC, electrical, cleaning, landscaping and security coordination — across the HQ campus.

Term: 36 months with an annual performance review. SRCA may adjust scope by ±10% with 30 days notice.

KPIs: 98% helpdesk resolution within SLA; critical HVAC faults restored within 4 hours. Penalties apply for repeated SLA breaches.

Under review: the annual escalation clause (proposed CPI + 2%) is being negotiated; Legal flagged the indemnity wording for revision.`,
  },
  {
    id: "ct4",
    ref: "RFT-2026-014",
    title: "Medical Consumables Framework Tender",
    titleAr: "مناقصة إطار المستهلكات الطبية",
    kind: "Tender",
    counterparty: "4 bidders",
    department: "Procurement & Logistics",
    owner: "Ms. Sara Al-Zahrani",
    value: "SAR 42M / year (est.)",
    status: "Under Review",
    date: "2026-02-02",
    body: `MEDICAL CONSUMABLES FRAMEWORK TENDER (RFT-2026-014).

Scope: a 3-year framework for the supply of medical consumables (airway, IV, wound care, PPE) to all SRCA regions, estimated at SAR 42 million annually.

Mandatory requirements: (1) SFDA registration for all supplied items; (2) on-Kingdom warehousing with 48-hour replenishment; (3) cold-chain compliance for temperature-sensitive items; (4) local content ≥ 30% per Vision 2030.

Bidders: Vendor A — lowest price, local content 22% (fails mandatory #4). Vendor B — price +6%, local content 41%, strongest logistics. Vendor C — price +9%, incomplete cold-chain evidence. Vendor D — withdrawn.

Evaluation is in progress; award recommendation pending committee sign-off.`,
  },
  {
    id: "ct5",
    ref: "RFT-2026-021",
    title: "Ambulance Chassis & Conversion Tender",
    titleAr: "مناقصة هياكل الإسعاف والتجهيز",
    kind: "Tender",
    counterparty: "Awarded — Gulf Emergency Vehicles",
    department: "Fleet & Logistics",
    owner: "Eng. Faisal Al-Harbi",
    value: "SAR 88M",
    status: "Awarded",
    date: "2026-01-19",
    body: `AMBULANCE CHASSIS & CONVERSION TENDER (RFT-2026-021).

Scope: supply and medical conversion of 120 Type-B ambulances over 18 months, including telemetry, stretchers and defibrillator mounting.

Mandatory requirements: (1) compliance with SRCA ambulance specification v3; (2) on-Kingdom conversion facility; (3) 3-year warranty and parts availability; (4) training for SRCA technicians.

Outcome: awarded to Gulf Emergency Vehicles — met all mandatory requirements with the strongest warranty and local conversion capability. Delivery scheduled in three batches.`,
  },
  {
    id: "ct6",
    ref: "RFT-2026-018",
    title: "Uniform & PPE Supply Tender",
    titleAr: "مناقصة توريد الزي ومعدات الوقاية",
    kind: "Tender",
    counterparty: "Draft — not yet published",
    department: "Administration",
    owner: "Mr. Yousef Al-Ghamdi",
    value: "SAR 12M (est.)",
    status: "Draft",
    date: "2026-02-04",
    body: `UNIFORM & PPE SUPPLY TENDER (RFT-2026-018) — DRAFT.

Scope: annual supply of field uniforms, high-visibility jackets and personal protective equipment for 8,000 staff and volunteers.

Draft mandatory requirements: (1) certified flame-retardant and hi-vis compliance; (2) sizing across full range with 4-week replenishment; (3) local content ≥ 30%; (4) sustainable materials preferred.

Status: draft under internal review; scope and evaluation criteria to be finalised before publication.`,
  },
];

export function findContractRecord(id: string): ContractRecord | undefined {
  return CONTRACT_RECORDS.find((c) => c.id === id);
}
