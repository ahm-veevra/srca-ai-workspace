/**
 * Seeded SRCA meeting register for the Meeting Management System reference (demo).
 * Records are simulated (as they'd live in the customer's meeting system); the AI over them —
 * transcription, minutes/decisions/actions, ask-this-meeting — is genuinely AICP.
 */

export type MeetingStatus = "Scheduled" | "Held" | "Minuted";

export interface Meeting {
  id: string;
  title: string;
  titleAr: string;
  date: string;
  time: string;
  durationMin: number;
  department: string;
  organizer: string;
  attendees: string[];
  status: MeetingStatus;
  agenda: string[];
  /** Meeting transcript — what AICP produces minutes from and answers questions over. */
  transcript: string;
}

export const MEETINGS: Meeting[] = [
  {
    id: "m1",
    title: "997 Operations Daily Briefing",
    titleAr: "الإحاطة اليومية لعمليات 997",
    date: "2026-02-03",
    time: "08:00",
    durationMin: 30,
    department: "Operations",
    organizer: "Dr. Noura Al-Qahtani",
    attendees: ["Dr. Noura Al-Qahtani", "Capt. Faisal Al-Harbi", "Ms. Reem Al-Shehri", "Mr. Tariq Al-Malki"],
    status: "Minuted",
    agenda: ["Overnight incident review", "Fleet availability", "Hospital capacity", "Staffing for evening shift"],
    transcript: `Noura: Good morning. Overnight we handled 412 calls in Riyadh, response time held at 8.1 minutes. Two red cases in Al-Malaz, both transported within target.
Faisal: Fleet availability is 78% this morning — three ambulances are in for maintenance, expected back by noon.
Reem: King Fahad Medical City reported 88% ED occupancy overnight and asked for diversion of non-critical cases for a few hours.
Noura: Let's action a temporary diversion for non-critical to Riyadh Care until 14:00. Reem, confirm with dispatch.
Tariq: Evening shift is short two crews in the north sector. Overtime risk is high.
Noura: Add two crews to the Riyadh evening shift, and rotate the three responders nearing 12-hour duty. Tariq to arrange by 15:00.
Noura: One open item — the predictive-maintenance rollout status; let's revisit tomorrow with Logistics.`,
  },
  {
    id: "m2",
    title: "Hajj 2026 Medical Readiness Planning",
    titleAr: "تخطيط الجاهزية الطبية لحج 2026",
    date: "2026-01-29",
    time: "10:00",
    durationMin: 90,
    department: "Emergency Preparedness",
    organizer: "Dr. Khalid Al-Dossary",
    attendees: ["Dr. Khalid Al-Dossary", "MOH Liaison — Dr. Salem", "Ms. Sara Al-Zahrani", "Eng. Faisal Al-Harbi"],
    status: "Held",
    agenda: ["Ambulance & crew allocation for Mashaer", "Field medical points", "Mass-casualty escalation", "Joint workshop date"],
    transcript: `Khalid: The Ministry has asked us to confirm allocation for the Mashaer area. Proposal is 120 ambulances and 40 rapid-response motorcycles.
Salem: The Ministry supports that. We also need the location of your field medical points confirmed by end of February.
Sara: Logistics can pre-stage two mobile field hospitals, 50 beds each, in the Mina area.
Khalid: Agreed — pre-stage the two field hospitals. Sara to coordinate placement with Civil Defense.
Faisal: For mass-casualty escalation, we activate the regional disaster plan at five or more casualties, unified command within 45 minutes.
Khalid: Let's lock the joint planning workshop for 20 February and nominate a liaison officer. I'll nominate Faisal as liaison.
Salem: Good. Please send the written allocation confirmation to the Ministry this week.`,
  },
  {
    id: "m3",
    title: "Procurement Committee — Consumables Framework",
    titleAr: "لجنة المشتريات — إطار المستهلكات",
    date: "2026-02-02",
    time: "13:00",
    durationMin: 60,
    department: "Procurement & Logistics",
    organizer: "Ms. Sara Al-Zahrani",
    attendees: ["Ms. Sara Al-Zahrani", "Mr. Abdullah Al-Otaibi", "Dr. Hana Al-Mutairi", "Mr. Yousef Al-Ghamdi"],
    status: "Minuted",
    agenda: ["Bid evaluation summary", "Local-content compliance", "Award recommendation"],
    transcript: `Sara: Four compliant bids for the consumables framework. Vendor A is lowest price but local content is 22%, failing the mandatory 30%.
Abdullah: So Vendor A is disqualified on mandatory local content, correct?
Sara: Correct. Vendor B is six percent higher but 41% local content and the strongest replenishment SLA.
Hana: From compliance, Vendor B's SFDA registrations and cold-chain evidence are complete. Vendor C's cold-chain evidence is incomplete.
Sara: Recommendation is to award to Vendor B. It's the only bid meeting all mandatory requirements.
Abdullah: The committee agrees to award to Vendor B. Sara to prepare the award letter and notify unsuccessful bidders.
Yousef: We should also debrief Vendor A on the local-content gap for future bids.`,
  },
  {
    id: "m4",
    title: "Fleet Maintenance Quarterly Review",
    titleAr: "المراجعة الفصلية لصيانة الأسطول",
    date: "2026-01-27",
    time: "11:00",
    durationMin: 45,
    department: "Logistics",
    organizer: "Eng. Faisal Al-Harbi",
    attendees: ["Eng. Faisal Al-Harbi", "Fleet Care — Mr. Nasser", "Mr. Tariq Al-Malki"],
    status: "Held",
    agenda: ["Availability performance", "December service credits", "Predictive maintenance pilot"],
    transcript: `Faisal: December availability came in at 90.8% against a 92% target, which triggers service credits.
Nasser: Our records show 91.4%. We'd like a joint review of the availability logs before the settlement is finalised.
Faisal: Fair — let's do a joint log review this week and reconcile the figure. Tariq to schedule.
Tariq: On the predictive-maintenance pilot, three units flagged high failure probability — Ambulance 117 brake wear, 244 battery, 391 engine temperature.
Faisal: Prioritise 117 and 391 this week. Nasser, can your team take them in by Thursday?
Nasser: Yes, we'll take 117 and 391 by Thursday.
Faisal: Decision: reconcile December availability jointly, and bring forward maintenance on 117 and 391.`,
  },
  {
    id: "m5",
    title: "Board Risk & Governance Review",
    titleAr: "مراجعة المخاطر والحوكمة للمجلس",
    date: "2026-02-05",
    time: "09:00",
    durationMin: 120,
    department: "Executive Office",
    organizer: "Mr. Abdullah Al-Otaibi",
    attendees: ["Board Members", "Mr. Abdullah Al-Otaibi", "Dr. Hana Al-Mutairi"],
    status: "Scheduled",
    agenda: ["Q4 performance", "Top operational risks", "Data protection posture", "AI governance"],
    transcript: `Abdullah: Q4 handled 1.28 million calls, SLA at 91% against a 94% target, driven by Hajj overflow and two weather events.
Hana: Top risks: crew fatigue in Riyadh evenings, hospital capacity at three referral centers, and unplanned fleet downtime.
Abdullah: The board should note the SLA gap and endorse the three mitigations: added evening crews, a hospital diversion protocol, and the predictive-maintenance rollout.
Hana: On data protection, all patient data remains in-Kingdom and AI runs on-premises under governance. No breaches this quarter.
Abdullah: Decision: endorse the three mitigations and commission a quarterly AI-governance report to the board.`,
  },
  {
    id: "m6",
    title: "Volunteer Programme Expansion Sync",
    titleAr: "اجتماع توسعة برنامج المتطوعين",
    date: "2026-01-22",
    time: "14:00",
    durationMin: 40,
    department: "Human Resources",
    organizer: "Mr. Yousef Al-Ghamdi",
    attendees: ["Mr. Yousef Al-Ghamdi", "Regional HR — Ms. Lina", "Training — Mr. Majed"],
    status: "Held",
    agenda: ["Recruitment targets", "Training cohorts", "Insurance & credentialing", "Retention"],
    transcript: `Yousef: Target is to grow the trained volunteer pool from 4,000 to 6,500 by end of Q2.
Lina: Each region will submit its recruitment target by 25 January.
Majed: Training cohorts start monthly from February; each volunteer completes the 40-hour BLS and mass-gathering curriculum.
Yousef: Volunteers must be insured and credentialed before any field deployment — no exceptions.
Majed: For retention, we propose a recognition programme and priority scheduling for returning volunteers.
Yousef: Agreed. Decision: regions submit targets by 25 January, cohorts begin in February, and we launch the recognition programme.`,
  },
];

export function findMeeting(id: string): Meeting | undefined {
  return MEETINGS.find((m) => m.id === id);
}
