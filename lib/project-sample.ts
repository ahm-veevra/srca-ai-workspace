/**
 * Seeded SRCA project register for the Project (PMO) System reference (demo). Project status
 * reports are simulated records; AICP assesses each into health, risks, actions, milestones and
 * lessons. Talk-to-record is genuinely AICP.
 */

export type ProjStatus = "On Track" | "At Risk" | "Delayed" | "Complete";

export interface ProjectRecord {
  id: string;
  title: string;
  titleAr: string;
  sponsor: string;
  department: string;
  status: ProjStatus;
  date: string;
  body: string;
}

export const PROJECT_RECORDS: ProjectRecord[] = [
  {
    id: "pj1",
    title: "AICP Integration Programme",
    titleAr: "برنامج تكامل AICP",
    sponsor: "CIO Office",
    department: "IT & Digital",
    status: "On Track",
    date: "2026-02-03",
    body: `PROJECT STATUS — AICP Integration Programme (as of 3 Feb 2026)

Progress: 68%. The command center, contract, correspondence, meeting, HR and procurement centers are integrated with AICP. Data-lake connector live.

Recent: shipped the enterprise-app references (DMS, correspondence tracking, meeting management). Fixed a data-plane auth issue and a Postgres connection leak on the platform side.

Issues: an AICP-side model-registry pinning bug is open (cosmetic). Capability entitlement had to be corrected (data connector = app identity, capabilities = user identity).

Milestones: connector live (done, 15 Jan); enterprise references (in progress, target 20 Feb); Arabic localization (done); go-live review (target 5 Mar).

Risks: dependency on the AICP terminal for backend fixes; demo data is seeded, not production-connected.`,
  },
  {
    id: "pj2",
    title: "Fleet Predictive Maintenance Rollout",
    titleAr: "نشر الصيانة التنبؤية للأسطول",
    sponsor: "Director of Logistics",
    department: "Fleet & Logistics",
    status: "At Risk",
    date: "2026-01-30",
    body: `PROJECT STATUS — Fleet Predictive Maintenance Rollout (as of 30 Jan 2026)

Progress: 45%. Telematics installed on 210 of 340 ambulances. Predictive model flagged and prevented two failures this month.

Issues: sensor supply delay is holding up the remaining 130 installations. Integration with the maintenance vendor's system is behind schedule.

Milestones: pilot complete (done); full telematics install (delayed, was Feb, now Apr); vendor integration (at risk); benefits realisation review (target Q2).

Risks: sensor supply (high) could push the rollout a full quarter; vendor integration dependency (medium).`,
  },
  {
    id: "pj3",
    title: "Volunteer Platform Upgrade",
    titleAr: "ترقية منصة المتطوعين",
    sponsor: "Director of Human Capital",
    department: "Human Resources",
    status: "On Track",
    date: "2026-01-22",
    body: `PROJECT STATUS — Volunteer Platform Upgrade (as of 22 Jan 2026)

Progress: 80%. New credentialing and scheduling modules delivered; onboarding flow simplified to support the 4,000 → 6,500 volunteer expansion.

Recent: training-cohort scheduling automated; insurance/credential checks now enforced before deployment.

Milestones: credentialing module (done); scheduling (done); mobile app (in progress, target Feb); go-live (target Mar, ahead of Hajj).

Risks: mobile app testing timeline tight (low–medium).`,
  },
  {
    id: "pj4",
    title: "Riyadh Command Center Expansion",
    titleAr: "توسعة مركز قيادة الرياض",
    sponsor: "COO",
    department: "Operations",
    status: "Delayed",
    date: "2026-02-01",
    body: `PROJECT STATUS — Riyadh Command Center Expansion (as of 1 Feb 2026)

Progress: 30%. Fit-out of the expanded operations floor underway; additional dispatcher positions and video-wall procurement in progress.

Issues: facilities contractor behind on the HVAC and power works; video-wall delivery slipped 6 weeks.

Milestones: design sign-off (done); fit-out (delayed); technology install (blocked by fit-out); operational readiness (target Q3, at risk).

Risks: contractor performance (high); technology delivery (medium). Recommend escalating the FM contract SLA and adding a delivery penalty.`,
  },
];

export function findProjectRecord(id: string): ProjectRecord | undefined {
  return PROJECT_RECORDS.find((r) => r.id === id);
}
