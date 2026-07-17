/**
 * Seeded SRCA correspondence register for the Correspondence Tracking System reference (demo).
 * Records are simulated (as they would live in the customer's correspondence system); the AI over
 * them — triage, talk-to-letter, reply drafting — is genuinely AICP.
 *
 * Each record carries an `official` letterhead block so the viewer can render it as a real Saudi
 * government letter (بسم الله، المملكة العربية السعودية، الجهة، رقم/تاريخ، توقيع، ختم). Most letters
 * are in formal Arabic (the norm for Saudi government correspondence); one contractor letter is in
 * English. `body` holds the letter's core content in its own language.
 */

export type Direction = "Incoming" | "Outgoing";
export type CorrStatus = "New" | "In Review" | "Routed" | "Replied" | "Closed";
export type Priority = "High" | "Medium" | "Low";
export type Channel = "Letter" | "Email" | "Fax";
export type Seal = "crescent" | "gov" | "none";

/** Official letterhead / signature metadata used to render the government-letter template. */
export interface LetterMeta {
  /** Issuing entity as printed on the letterhead (in the letter's language). */
  entity: string;
  /** Sub-department / directorate line under the entity. */
  department?: string;
  /** Hijri date string (Arabic-Indic numerals), e.g. "١٠ شعبان ١٤٤٧هـ". */
  hijri?: string;
  /** Addressee line, e.g. "سعادة مدير عام العمليات ... المحترم". */
  recipient: string;
  /** Signatory name. */
  signatory: string;
  /** Signatory title. */
  signatoryTitle: string;
  /** Number of attachments (0/undefined hides the row). */
  attachments?: number;
  /** Which official seal to stamp. */
  seal?: Seal;
}

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
  /** Primary language of the letter — drives RTL rendering + label language in the viewer. */
  lang: "ar" | "en";
  /** Letter core content, in `lang`. The viewer wraps it in the official template. */
  body: string;
  official?: LetterMeta;
}

export const CORRESPONDENCE: Correspondence[] = [
  {
    id: "c1",
    ref: "CORR-2026-0312",
    subject: "Complaint — prolonged water outage, Al-Nakheel district",
    subjectAr: "شكوى — انقطاع مياه مطوّل في حي النخيل",
    from: "لجنة أهالي حي النخيل",
    to: "SRCA — Community Relations",
    direction: "Incoming",
    status: "New",
    priority: "High",
    channel: "Email",
    date: "2026-02-03",
    lang: "ar",
    body: `نكتب إليكم نيابةً عن لجنة أهالي حي النخيل بخصوص انقطاع المياه المطوّل الذي يؤثر على أكثر من (٢٠٠) أسرة منذ ستة أيام، حيث يوجد عدد من كبار السن والأسر التي لديها أطفال رضّع دون مياه جارية، ونخشى من المخاطر الصحية المترتبة على ذلك.

لذا نأمل من سعادتكم التكرّم بالآتي:
١- التنسيق العاجل مع الجهات المختصة لإعادة ضخّ المياه.
٢- توفير مياه شرب مؤقتة للأسر المتضررة.
٣- تحديد جهة تواصل لتزويدنا بالمستجدات يوميًا.

نأمل معالجة الأمر على وجه السرعة، ولكم جزيل الشكر. للتواصل: لجنة الأهالي — جوال ٠٥٥١١١٢٢٢٢.`,
    official: {
      entity: "لجنة أهالي حي النخيل",
      hijri: "١٥ شعبان ١٤٤٧هـ",
      recipient: "إلى إدارة العلاقات المجتمعية بهيئة الهلال الأحمر السعودي الموقّرة",
      signatory: "أحمد بن محمد العتيبي",
      signatoryTitle: "رئيس لجنة الأهالي",
      seal: "none",
    },
  },
  {
    id: "c2",
    ref: "CORR-2026-0298",
    subject: "Inter-agency coordination — Hajj 2026 medical staging",
    subjectAr: "تنسيق مشترك — التمركز الطبي لحج ١٤٤٧هـ",
    from: "وزارة الصحة — الإدارة العامة للطوارئ",
    to: "SRCA — Operations",
    direction: "Incoming",
    status: "In Review",
    priority: "High",
    channel: "Letter",
    date: "2026-01-29",
    lang: "ar",
    body: `إلحاقًا بالتحضيرات الخاصة بموسم حج عام ١٤٤٧هـ، وحرصًا على تكامل الجهود الميدانية بين الجهات الصحية، نأمل من سعادتكم التكرّم باعتماد وتزويدنا بالآتي:

أولاً: تأكيد عدد سيارات الإسعاف والفرق الطبية المخصصة لمنطقة المشاعر المقدسة.
ثانياً: تحديد مواقع النقاط الطبية الميدانية وخطة الانتشار المكاني.
ثالثاً: اعتماد بروتوكول التصعيد الموحّد لحالات الإصابات الجماعية.

كما نأمل ترشيح ضابط ارتباط، وتأكيد المشاركة في ورشة التخطيط المشتركة المقرر عقدها بتاريخ ٢٠ فبراير ٢٠٢٦م.

شاكرين لكم حسن تعاونكم، ونتطلّع إلى تأكيدكم في أقرب فرصة.`,
    official: {
      entity: "وزارة الصحة",
      department: "الإدارة العامة للطوارئ والأزمات والكوارث الصحية",
      hijri: "١٠ شعبان ١٤٤٧هـ",
      recipient: "سعادة مدير عام العمليات بهيئة الهلال الأحمر السعودي المحترم",
      signatory: "د. فهد بن ناصر القحطاني",
      signatoryTitle: "المدير العام للطوارئ والأزمات والكوارث الصحية",
      attachments: 2,
      seal: "gov",
    },
  },
  {
    id: "c3",
    ref: "CORR-2026-0305",
    subject: "Hospital diversion notice — King Fahad Medical City at capacity",
    subjectAr: "إشعار تحويل — مدينة الملك فهد الطبية بلغت السعة",
    from: "مدينة الملك فهد الطبية",
    to: "SRCA — Riyadh Command Center",
    direction: "Incoming",
    status: "Routed",
    priority: "High",
    channel: "Fax",
    date: "2026-02-01",
    lang: "ar",
    body: `نفيد سعادتكم بأن مدينة الملك فهد الطبية قد بلغت السعة القصوى لقسم الطوارئ اعتبارًا من الساعة الثانية ظهرًا من تاريخه.

عليه، نأمل تحويل الحالات غير الحرجة مؤقتًا إلى المنشآت الصحية البديلة لمدة (٦) ساعات، مع استمرار استقبال الحالات الحرجة والحسّاسة للوقت (القلبية، والسكتة الدماغية، والإصابات الكبرى).

نأمل الإحاطة وتحديث مسارات التوجيه لديكم بما يتوافق مع ما سبق، ولكم تحياتنا.`,
    official: {
      entity: "مدينة الملك فهد الطبية",
      department: "إدارة الطوارئ والإسعاف",
      hijri: "١٣ شعبان ١٤٤٧هـ",
      recipient: "إلى مركز القيادة والسيطرة بمنطقة الرياض — هيئة الهلال الأحمر السعودي",
      signatory: "د. سارة بنت عبدالعزيز الدوسري",
      signatoryTitle: "مدير إدارة الطوارئ والإسعاف",
      seal: "gov",
    },
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
    lang: "en",
    body: `With reference to invoice INV-2025-4471, we note a deduction of SAR 55,500 applied as service credits for the December availability shortfall.

We respectfully dispute the calculation: our records show fleet availability of 91.4%, not 90.8% as stated, which would materially reduce the applicable credit.

We therefore request a joint review of the availability logs and a corrected settlement. Kindly advise a suitable date for the review.`,
    official: {
      entity: "Fleet Care Medical Services Co.",
      department: "Contracts & Settlements",
      recipient: "To the Procurement Department, Saudi Red Crescent Authority",
      signatory: "Eng. Khalid Al-Harbi",
      signatoryTitle: "Contracts & Settlements Manager",
      attachments: 1,
      seal: "none",
    },
  },
  {
    id: "c5",
    ref: "CORR-2026-0260",
    subject: "Letter of appreciation — volunteer flood response",
    subjectAr: "خطاب شكر — استجابة المتطوعين للسيول",
    from: "إمارة المنطقة الشرقية",
    to: "SRCA — Volunteer Affairs",
    direction: "Incoming",
    status: "Replied",
    priority: "Low",
    channel: "Letter",
    date: "2026-01-18",
    lang: "ar",
    body: `يطيب لنا في إمارة المنطقة الشرقية أن نعبّر لكم عن خالص شكرنا وتقديرنا للجهود الاستثنائية التي بذلها منسوبو ومتطوعو هيئة الهلال الأحمر السعودي أثناء موجة السيول الأخيرة في محافظتي الدمام والجبيل.

لقد كان لسرعة الاستجابة والاحترافية العالية أثرٌ بالغ في إنقاذ الأرواح والتخفيف عن الأسر المتضررة، وهو ما يعكس المستوى المشرّف الذي تتحلّون به.

نأمل إبلاغ جميع المشاركين بخالص شكرنا وتقديرنا، سائلين الله لكم دوام التوفيق.`,
    official: {
      entity: "إمارة المنطقة الشرقية",
      department: "وكالة الإمارة للمحافظات والمتابعة",
      hijri: "٢٨ رجب ١٤٤٧هـ",
      recipient: "سعادة الأمين العام لهيئة الهلال الأحمر السعودي المحترم",
      signatory: "عبدالرحمن بن سعد الفرج",
      signatoryTitle: "وكيل إمارة المنطقة الشرقية للمحافظات",
      seal: "gov",
    },
  },
  {
    id: "c6",
    ref: "CORR-2026-0244",
    subject: "Request for first-aid training — municipal staff",
    subjectAr: "طلب تدريب إسعافات أولية — منسوبو الأمانة",
    from: "أمانة منطقة الرياض",
    to: "SRCA — Training Center",
    direction: "Incoming",
    status: "New",
    priority: "Medium",
    channel: "Email",
    date: "2026-01-15",
    lang: "ar",
    body: `نظرًا لحرص أمانة منطقة الرياض على رفع جاهزية منسوبيها الميدانيين، نأمل من مركز التدريب لديكم تزويدنا بعرضٍ لتقديم دورات معتمدة في الإسعافات الأولية والإنعاش القلبي الرئوي لعدد (١٥٠) موظفًا على ثلاث دفعات خلال الربع الثاني من عام ٢٠٢٦م.

يُرجى إفادتنا بالمواعيد المتاحة، والمنهج التدريبي، ومدة الدورة، وآلية الاعتماد، والتكلفة التقديرية، وإمكانية تنفيذ التدريب في مقارّ الأمانة.

ولكم جزيل الشكر والتقدير على تعاونكم المستمر.`,
    official: {
      entity: "أمانة منطقة الرياض",
      department: "الإدارة العامة للموارد البشرية",
      hijri: "٢٥ رجب ١٤٤٧هـ",
      recipient: "إلى مركز التدريب بهيئة الهلال الأحمر السعودي الموقّر",
      signatory: "م. ناصر بن سليمان العنقري",
      signatoryTitle: "مدير عام الموارد البشرية",
      seal: "gov",
    },
  },
  {
    id: "c7",
    ref: "CORR-2026-0233",
    subject: "Internal circular — updated dispatch SOP v4.2",
    subjectAr: "تعميم داخلي — تحديث إجراء الإرسال ٤٫٢",
    from: "هيئة الهلال الأحمر السعودي — الإدارة العامة للعمليات",
    to: "All Regional Command Centers",
    direction: "Outgoing",
    status: "Closed",
    priority: "Medium",
    channel: "Email",
    date: "2026-01-08",
    lang: "ar",
    body: `يُعتمد اعتبارًا من تاريخه تحديث إجراء العمل الموحّد للإرسال الطارئ (٩٩٧) إلى الإصدار ٤٫٢، وتتضمّن أبرز التغييرات ما يلي:

- الإرسال لأقرب مركبة عبر تحديد الموقع الجغرافي (بدلاً من مركز الانطلاق).
- تحديث مستهدفات زمن الاستجابة للمناطق الحضرية والريفية.
- اعتماد آلية منظّمة لتسليم الحالة في موقع الحدث.

على جميع مستقبِلي البلاغات والمرسِلين إكمال الوحدة التنشيطية في موعد أقصاه ٣١ يناير ٢٠٢٦م. وللاستفسار يُرجى التواصل مع الإدارة العامة للعمليات.`,
    official: {
      entity: "هيئة الهلال الأحمر السعودي",
      department: "الإدارة العامة للعمليات",
      hijri: "١٨ رجب ١٤٤٧هـ",
      recipient: "إلى كافة مراكز القيادة والسيطرة بالمناطق",
      signatory: "د. عبدالله بن سعيد الغامدي",
      signatoryTitle: "المدير العام للعمليات",
      seal: "crescent",
    },
  },
];

export function findCorrespondence(id: string): Correspondence | undefined {
  return CORRESPONDENCE.find((c) => c.id === id);
}
