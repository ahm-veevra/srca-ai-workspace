/**
 * Seeded SRCA compliance register for the Compliance System reference (demo). Policies/procedures
 * are simulated records, each assessed against a target framework; the AI over them —
 * control-by-control assessment, gaps, recommendations, ask-this-record — is genuinely AICP.
 */

export type CompStatus = "Compliant" | "Gaps" | "Under Review" | "Pending";

export interface CompRecord {
  id: string;
  title: string;
  titleAr: string;
  /** The framework to assess against (passed to /compliance-intelligence/analyze). */
  framework: string;
  department: string;
  status: CompStatus;
  date: string;
  body: string;
}

export const COMPLIANCE_RECORDS: CompRecord[] = [
  {
    id: "co1",
    title: "Data Protection & Patient Confidentiality Policy",
    titleAr: "سياسة حماية البيانات وسرية المرضى",
    framework: "PDPL (Personal Data Protection Law)",
    department: "Legal & Compliance",
    status: "Under Review",
    date: "2026-01-15",
    body: `DATA PROTECTION & PATIENT CONFIDENTIALITY POLICY (v3.0)

Scope: governs collection, processing, storage and disclosure of personal and health data across all SRCA systems; applies to employees, volunteers and contractors.

Lawful basis: personal data is processed only for emergency response, quality assurance and legal obligations.

Data sovereignty: all personal and health data is stored and processed within the Kingdom; cross-border transfer is prohibited without explicit legal authorisation.

Access control: least-privilege, clearance-based; every access is logged and auditable.

Retention: operational patient records retained 10 years then securely destroyed; audit logs retained 7 years, immutable.

Breach: suspected breaches reported to the DPO within 24 hours and to the regulator as required.

Note: the policy does not yet document a Data Protection Impact Assessment (DPIA) process, nor an explicit data-subject rights (access/erasure) procedure.`,
  },
  {
    id: "co2",
    title: "Information Security Controls Standard",
    titleAr: "معيار ضوابط أمن المعلومات",
    framework: "NCA Essential Cybersecurity Controls (ECC)",
    department: "IT Security",
    status: "Gaps",
    date: "2026-01-28",
    body: `INFORMATION SECURITY CONTROLS STANDARD

Identity & access: multi-factor authentication for administrative access; role-based access control; quarterly access reviews.

Network: segmentation between clinical, corporate and command-center networks; firewalls with default-deny.

Data protection: encryption at rest and in transit; on-premises key management.

Logging & monitoring: centralised logging; 90-day online retention. (Note: no 24/7 SOC monitoring yet; alerting is business-hours only.)

Vulnerability management: monthly scanning; patching SLA 30 days. (Note: no formal penetration-testing schedule.)

Incident response: documented playbook; annual tabletop exercise.

Backup: daily backups; quarterly restore tests.`,
  },
  {
    id: "co3",
    title: "Medical Consumables Cold-Chain Procedure",
    titleAr: "إجراء سلسلة التبريد للمستهلكات الطبية",
    framework: "SFDA Good Distribution Practice (GDP)",
    department: "Procurement & Logistics",
    status: "Compliant",
    date: "2026-01-10",
    body: `MEDICAL CONSUMABLES COLD-CHAIN PROCEDURE

Storage: temperature-sensitive items stored in monitored 2–8°C units with continuous logging and alarms.

Transport: validated cold boxes with temperature loggers; excursions recorded and investigated.

Receiving: temperature verified on delivery; out-of-range shipments quarantined pending assessment.

Calibration: temperature monitoring devices calibrated annually against a traceable standard.

Records: cold-chain records retained for the product shelf life plus one year.

Training: warehouse staff trained annually on GDP cold-chain handling.`,
  },
  {
    id: "co4",
    title: "AI Governance & Model Use Policy",
    titleAr: "سياسة حوكمة الذكاء الاصطناعي واستخدام النماذج",
    framework: "SRCA AI Governance Framework",
    department: "Legal & Compliance",
    status: "Pending",
    date: "2026-02-04",
    body: `AI GOVERNANCE & MODEL USE POLICY (draft)

Sovereignty: all AI processing of SRCA data runs on-premises; model providers must be sovereign; no data leaves the Kingdom.

Governance: every AI request is governed (policy pre/post checks) and produces an auditable trace.

Data handling: models must not retain request data beyond the request; PII is redacted where required.

Human oversight: high-impact AI actions require human-in-the-loop approval before execution.

Transparency: each AI result records the model, routing and grounding used.

Note (draft gaps): no defined model-evaluation/bias-testing cadence; no documented model-decommissioning process; roles for AI risk ownership not yet assigned.`,
  },
  {
    id: "co5",
    title: "Incident Data Retention Standard",
    titleAr: "معيار الاحتفاظ ببيانات الحوادث",
    framework: "PDPL (Personal Data Protection Law)",
    department: "Operations",
    status: "Compliant",
    date: "2026-01-22",
    body: `INCIDENT DATA RETENTION STANDARD

Scope: 997 emergency incident records, dispatch logs and patient care reports.

Retention: patient care reports retained 10 years; dispatch logs 5 years; call audio 1 year.

Minimisation: only data necessary for care, quality and legal obligations is retained.

Destruction: secure, logged destruction at end of retention; certificate of destruction kept.

Access: retention-period access is clearance-based and audited.

Legal hold: records under investigation are exempt from destruction until the hold is lifted.`,
  },
];

export function findCompRecord(id: string): CompRecord | undefined {
  return COMPLIANCE_RECORDS.find((r) => r.id === id);
}
