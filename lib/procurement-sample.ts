/**
 * Seeded SRCA procurement register for the Procurement System reference (demo). Spend records and
 * vendor evaluations are simulated; the AI over them — spend analysis, vendor comparison,
 * ask-this-record — is genuinely AICP.
 */

export type ProcKind = "Spend" | "Vendors";
export type ProcStatus = "Draft" | "In Review" | "Final" | "Awarded";

export interface ProcRecord {
  id: string;
  kind: ProcKind;
  title: string;
  titleAr: string;
  department: string;
  category: string;
  status: ProcStatus;
  date: string;
  value: string;
  /** The text AICP analyses (a spend breakdown, or vendor bid information). */
  body: string;
}

export const PROC_RECORDS: ProcRecord[] = [
  {
    id: "sp1",
    kind: "Spend",
    title: "Q4 2025 Procurement Spend Summary",
    titleAr: "ملخص إنفاق المشتريات للربع الرابع 2025",
    department: "Procurement & Logistics",
    category: "All categories",
    status: "Final",
    date: "2026-01-18",
    value: "SAR 61.4M",
    body: `SRCA PROCUREMENT SPEND — Q4 2025 (total SAR 61.4M)

By category:
- Medical consumables: SAR 22.1M (36%)
- Fleet maintenance & parts: SAR 14.8M (24%)
- Medical equipment: SAR 9.6M (16%)
- Facilities & utilities: SAR 6.2M (10%)
- Training & uniforms: SAR 4.9M (8%)
- IT & communications: SAR 3.8M (6%)

Top vendors:
- Fleet Care Medical Services: SAR 7.4M (fleet maintenance)
- MedSupply Arabia: SAR 6.3M (consumables)
- Sahara Medical Gases: SAR 2.1M (oxygen)
- Prime Facilities: SAR 3.6M (FM)

Notes: consumables spend up 9% YoY driven by Hajz overflow. Three single-source categories (oxygen, telemetry, uniforms) with no competitive tender in 18 months.`,
  },
  {
    id: "sp2",
    kind: "Spend",
    title: "Medical Consumables Spend — YTD 2026",
    titleAr: "إنفاق المستهلكات الطبية — حتى تاريخه 2026",
    department: "Procurement & Logistics",
    category: "Medical consumables",
    status: "In Review",
    date: "2026-02-04",
    value: "SAR 7.9M",
    body: `MEDICAL CONSUMABLES SPEND — YTD 2026 (SAR 7.9M)

By sub-category: airway & respiratory SAR 2.4M; IV & fluids SAR 1.9M; wound care SAR 1.5M; PPE SAR 1.3M; diagnostics SAR 0.8M.

Vendors: MedSupply Arabia SAR 4.1M (52%), Gulf Medical SAR 2.2M (28%), others SAR 1.6M.

Notes: MedSupply concentration exceeds the 40% single-vendor guideline. PPE unit prices rose 12% vs the framework rate — possible off-contract buying. Emergency (non-framework) purchases were 14% of spend.`,
  },
  {
    id: "sp3",
    kind: "Spend",
    title: "Fleet Parts & Maintenance Spend — 2025",
    titleAr: "إنفاق قطع وصيانة الأسطول — 2025",
    department: "Fleet & Logistics",
    category: "Fleet",
    status: "Final",
    date: "2026-01-12",
    value: "SAR 52.3M",
    body: `FLEET PARTS & MAINTENANCE SPEND — 2025 (SAR 52.3M)

Preventive maintenance SAR 31.0M; unplanned repairs SAR 12.4M; parts SAR 6.1M; tyres SAR 2.8M.

Vendors: Fleet Care Medical Services SAR 29.6M; regional garages SAR 14.2M; parts distributors SAR 8.5M.

Notes: unplanned repairs are 24% of spend — high, and correlates with ageing units. Predictive maintenance pilot could shift spend from unplanned to preventive. Tyre pricing not benchmarked in 2 years.`,
  },
  {
    id: "vc1",
    kind: "Vendors",
    title: "Medical Consumables Framework — Bidder Comparison",
    titleAr: "مقارنة مقدّمي عطاء إطار المستهلكات",
    department: "Procurement & Logistics",
    category: "Medical consumables",
    status: "In Review",
    date: "2026-02-02",
    value: "SAR 42M / year",
    body: `MEDICAL CONSUMABLES FRAMEWORK — BIDDER INFORMATION (RFT-2026-014)

Vendor A: lowest price (index 100). Local content 22%. SFDA registered. Warehousing in-Kingdom, 72-hour replenishment. Cold-chain evidence complete.

Vendor B: price index 106. Local content 41%. SFDA registered. In-Kingdom warehousing, 48-hour replenishment, strongest logistics network. Cold-chain evidence complete.

Vendor C: price index 109. Local content 33%. SFDA registered. 96-hour replenishment. Cold-chain evidence incomplete.

Vendor D: withdrew before evaluation.

Mandatory requirements: SFDA registration; in-Kingdom warehousing with ≤48h replenishment; cold-chain compliance; local content ≥ 30%.`,
  },
  {
    id: "vc2",
    kind: "Vendors",
    title: "Ambulance Chassis Tender — Bidder Comparison",
    titleAr: "مقارنة مقدّمي عطاء هياكل الإسعاف",
    department: "Fleet & Logistics",
    category: "Fleet",
    status: "Awarded",
    date: "2026-01-19",
    value: "SAR 88M",
    body: `AMBULANCE CHASSIS & CONVERSION — BIDDER INFORMATION (RFT-2026-021)

Gulf Emergency Vehicles: meets SRCA ambulance spec v3. In-Kingdom conversion facility. 3-year warranty, strong parts availability. Technician training included. Price index 104.

Desert Auto Group: meets spec v3. Conversion partly offshore. 2-year warranty. Price index 100 (lowest).

National Fleet Co.: meets spec v3. In-Kingdom conversion. 3-year warranty. Limited telemetry integration experience. Price index 108.

Mandatory: ambulance spec v3; in-Kingdom conversion; 3-year warranty + parts; technician training.`,
  },
  {
    id: "vc3",
    kind: "Vendors",
    title: "Oxygen Supply — Vendor Evaluation",
    titleAr: "تقييم موردي الأكسجين",
    department: "Procurement & Logistics",
    category: "Medical gases",
    status: "Draft",
    date: "2026-02-05",
    value: "SAR 2.1M / year",
    body: `MEDICAL OXYGEN SUPPLY — VENDOR EVALUATION (replacement for expiring contract)

Sahara Medical Gases (incumbent): 24-hour replenishment across 42 stations, SFDA compliant, monthly regulator inspection. Price index 100. Single-source for 4 years.

Arabian Gas Solutions: 24-hour replenishment, SFDA compliant, offers telemetry cylinder tracking. Price index 97. No prior SRCA relationship.

Requirements: SFDA compliance; 24-hour replenishment to all stations; safety-incident reporting within 2 hours; monthly inspection.`,
  },
];

export function findProcRecord(id: string): ProcRecord | undefined {
  return PROC_RECORDS.find((r) => r.id === id);
}
