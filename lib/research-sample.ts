/**
 * Seeded SRCA research register for the Research System reference (demo). Research requests are
 * simulated; AICP runs the research on a topic + type and returns findings, opportunities, risks,
 * recommendations and sections. Talk-to-record is genuinely AICP.
 */

export type ResearchStatus = "Requested" | "In Progress" | "Complete";

export interface ResearchRecord {
  id: string;
  title: string;
  titleAr: string;
  requester: string;
  department: string;
  status: ResearchStatus;
  date: string;
  /** Default research type (the user can change it before running). */
  defaultType: string;
  description: string;
}

/** Research types offered by the workspace (passed as `research_type`). */
export const RESEARCH_TYPES = ["Feasibility", "Technical", "Market", "Policy", "Competitive"] as const;

export const RESEARCH_RECORDS: ResearchRecord[] = [
  {
    id: "rs1",
    title: "Drone delivery for remote and rural EMS",
    titleAr: "توصيل بالطائرات المسيّرة للإسعاف في المناطق النائية والريفية",
    requester: "Director of Innovation",
    department: "Emergency Preparedness",
    status: "Requested",
    date: "2026-02-04",
    defaultType: "Feasibility",
    description:
      "Assess whether medical drone delivery (AED, blood, medications) could cut response times for remote and rural emergencies in the Kingdom, including regulatory, operational and cost considerations for SRCA.",
  },
  {
    id: "rs2",
    title: "AI-assisted triage — best practices and safety",
    titleAr: "الفرز بمساعدة الذكاء الاصطناعي — أفضل الممارسات والسلامة",
    requester: "Chief Medical Officer",
    department: "Operations",
    status: "In Progress",
    date: "2026-01-28",
    defaultType: "Policy",
    description:
      "Research best practices, safety controls and governance for AI-assisted call triage in emergency medical dispatch, and what SRCA should adopt to keep a qualified dispatcher in control.",
  },
  {
    id: "rs3",
    title: "Electric ambulance fleet transition",
    titleAr: "التحول إلى أسطول إسعاف كهربائي",
    requester: "Director of Logistics",
    department: "Fleet & Logistics",
    status: "Requested",
    date: "2026-02-01",
    defaultType: "Market",
    description:
      "Evaluate the feasibility and market readiness of transitioning part of the SRCA ambulance fleet to electric vehicles — range, charging, cost of ownership, and suitability for emergency operations in Saudi conditions.",
  },
  {
    id: "rs4",
    title: "Mass-gathering surge staffing models",
    titleAr: "نماذج التوظيف المرن للتجمعات الكبرى",
    requester: "Director of Emergency Preparedness",
    department: "Emergency Preparedness",
    status: "Complete",
    date: "2026-01-15",
    defaultType: "Technical",
    description:
      "Research staffing and resource-surge models used by leading EMS providers for mass-gathering events (comparable to Hajj), and how predictive analytics can optimise crew and ambulance allocation.",
  },
];

export function findResearchRecord(id: string): ResearchRecord | undefined {
  return RESEARCH_RECORDS.find((r) => r.id === id);
}
