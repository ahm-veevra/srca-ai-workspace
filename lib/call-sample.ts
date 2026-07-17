/**
 * Seeded 997 call-center recordings for the Call Center reference (demo). Records are simulated (as
 * they would live in the customer's telephony/recording system); the AI over them — transcription,
 * translation, triage, talk-to-call — is genuinely AICP. `transcript` holds the recorded dialogue in
 * the call's own language; transcription of an uploaded audio and translation of the transcript both
 * run against live AICP endpoints.
 */

export type CallStatus = "Dispatched" | "Resolved" | "Transferred" | "Dropped";
export type CallPriority = "Critical" | "Urgent" | "Routine";

export interface CallRecord {
  id: string;
  number: string;
  region: string;
  regionAr: string;
  category: string;
  categoryAr: string;
  priority: CallPriority;
  agent: string;
  time: string;
  date: string;
  durationSec: number;
  status: CallStatus;
  lang: "ar" | "en";
  transcript: string;
}

export const CALLS: CallRecord[] = [
  {
    id: "call-1",
    number: "05•• ••• 1284",
    region: "Riyadh", regionAr: "الرياض",
    category: "Chest pain — suspected cardiac", categoryAr: "ألم صدري — اشتباه قلبي",
    priority: "Critical",
    agent: "Noura Al-Harbi",
    time: "14:32", date: "2026-02-03", durationSec: 168,
    status: "Dispatched", lang: "ar",
    transcript: `المشغّل: هيئة الهلال الأحمر، تفضّل.
المتصل: السلام عليكم، والدي يشكو من ألم شديد في الصدر وضيق في التنفّس، عمره ٦٨ سنة.
المشغّل: هل هو واعٍ ويتنفّس الآن؟
المتصل: نعم واعٍ لكنه يتعرّق بغزارة ويمسك صدره.
المشغّل: ما العنوان بالتحديد؟
المتصل: حي الملز، شارع الأمير عبدالله، عمارة رقم ١٢.
المشغّل: تم إرسال الإسعاف، ابقَ معه ولا تُعطِه شيئًا بالفم، وسأبقى معك على الخط.`,
  },
  {
    id: "call-2",
    number: "05•• ••• 6677",
    region: "Makkah Road", regionAr: "طريق مكة",
    category: "Road traffic accident", categoryAr: "حادث مروري",
    priority: "Critical",
    agent: "Faisal Al-Dosari",
    time: "09:14", date: "2026-02-03", durationSec: 205,
    status: "Dispatched", lang: "ar",
    transcript: `المشغّل: هيئة الهلال الأحمر، تفضّل.
المتصل: حادث تصادم على طريق مكة السريع، سيارتان وفيه مصابون.
المشغّل: كم عدد المصابين؟ وهل يوجد شخص محتجز داخل المركبة؟
المتصل: ثلاثة مصابين، واحد منهم لا يتحرّك ويوجد نزيف.
المشغّل: حدّد الموقع تقريبًا — أقرب مخرج أو علامة.
المتصل: بعد مخرج ٤ باتجاه الشمال، قبل محطة الوقود.
المشغّل: الفرق في طريقها إليك. أبعِد المصابين القادرين عن مسار السيارات، ولا تُحرّك المصاب الفاقد للحركة.`,
  },
  {
    id: "call-3",
    number: "05•• ••• 3390",
    region: "Riyadh", regionAr: "الرياض",
    category: "Allergic reaction — anaphylaxis", categoryAr: "تحسّس تنفّسي حاد",
    priority: "Critical",
    agent: "Mona Al-Qahtani",
    time: "18:47", date: "2026-02-02", durationSec: 142,
    status: "Dispatched", lang: "en",
    transcript: `Operator: Saudi Red Crescent, how can I help?
Caller: My daughter has a severe allergic reaction — her face is swelling and she's struggling to breathe.
Operator: How old is she, and do you have an epinephrine auto-injector?
Caller: She's 7, and no, we don't have one.
Operator: What is your exact address?
Caller: Al-Olaya district, Rahmaniyah compound, villa 8.
Operator: An ambulance is on the way. Keep her sitting upright, loosen tight clothing, and stay on the line with me.`,
  },
  {
    id: "call-4",
    number: "05•• ••• 8821",
    region: "Makkah — Mashaer", regionAr: "مكة — المشاعر",
    category: "Heat exhaustion", categoryAr: "إجهاد حراري",
    priority: "Urgent",
    agent: "Yousef Al-Otaibi",
    time: "12:05", date: "2026-02-01", durationSec: 131,
    status: "Dispatched", lang: "ar",
    transcript: `المشغّل: هيئة الهلال الأحمر، تفضّل.
المتصل: يوجد شخص فاقد للوعي بسبب الحرارة قرب جسر الجمرات.
المشغّل: هل يتنفّس؟ وهل جلده حارّ وجاف؟
المتصل: يتنفّس بصعوبة وجلده حارّ جدًا.
المشغّل: انقله إلى الظل إن أمكن وابدأ بتبريده بالماء وارفع قدميه قليلًا، والفرقة الطبية الأقرب في طريقها إليك.`,
  },
  {
    id: "call-5",
    number: "05•• ••• 4102",
    region: "Jeddah", regionAr: "جدة",
    category: "General enquiry — first-aid training", categoryAr: "استفسار — دورات إسعاف",
    priority: "Routine",
    agent: "Sara Al-Ghamdi",
    time: "10:20", date: "2026-02-01", durationSec: 74,
    status: "Transferred", lang: "ar",
    transcript: `المشغّل: هيئة الهلال الأحمر، تفضّل.
المتصل: أريد الاستفسار عن دورات الإسعافات الأولية، هل تُقدَّم للأفراد؟
المشغّل: نعم، تُقدَّم عبر مركز التدريب. سأحوّلك للقسم المختص، لحظة من فضلك.`,
  },
  {
    id: "call-6",
    number: "05•• ••• 0555",
    region: "Dammam", regionAr: "الدمام",
    category: "Dropped call", categoryAr: "مكالمة منقطعة",
    priority: "Routine",
    agent: "Khalid Al-Shammari",
    time: "22:58", date: "2026-01-31", durationSec: 12,
    status: "Dropped", lang: "ar",
    transcript: `المشغّل: هيئة الهلال الأحمر، تفضّل... ألو؟ هل تسمعني؟
(انقطع الاتصال قبل تحديد الطلب أو الموقع)`,
  },
];

export function findCall(id: string): CallRecord | undefined {
  return CALLS.find((c) => c.id === id);
}
