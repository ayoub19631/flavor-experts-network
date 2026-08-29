import type { Language } from "@/lib/languages";

export const TERMS_VERSION = "2026-08-30";

export type TermsSection = { title: string; body: string };

const EN: TermsSection[] = [
  {
    title: "1. Acceptance of Terms",
    body: "Flavor Experts Network is an educational and professional platform for flavor science and food technology. Creating an account or using the site means you have read, understood, and accepted these Terms. If you do not agree, do not use the platform.",
  },
  {
    title: "2. Educational purpose",
    body: "The platform exists only for professional learning, scientific exchange, industry news related to flavors and food technology, jobs, and company collaboration. It is not a political, entertainment, dating, or adult network.",
  },
  {
    title: "3. Strictly prohibited content — zero tolerance",
    body: "The following are forbidden in every post, comment, message, job, profile, file, or link. First serious violation may result in immediate permanent suspension: (1) Political news, political campaigning, political debate, or content about governments, parties, elections, or public figures in a political context. (2) Any content involving children — including images, stories, discussions, or links. This is a professional adult-education network. (3) Pornography, sexual content, nudity, or any adult/obscene material. These rules are absolute.",
  },
  {
    title: "4. Professional conduct",
    body: "Members must remain respectful, accurate, and scientific. Harassment, hate speech, spam, impersonation, confidential formula theft, and misleading commercial claims are prohibited.",
  },
  {
    title: "5. Membership",
    body: "The platform is currently free for individuals and companies. Access does not grant a right to publish prohibited content.",
  },
  {
    title: "6. Enforcement",
    body: "We may remove content and suspend or delete accounts that break these rules, with or without prior notice. Repeated or severe violations are reported to the appropriate authorities when required by law.",
  },
  {
    title: "7. Intellectual property",
    body: "Do not publish material you do not have the right to share. Platform branding and software remain our property.",
  },
  {
    title: "8. Privacy",
    body: "We collect account data only to operate the educational service. See the Privacy Policy. We do not sell your personal data.",
  },
  {
    title: "9. Changes",
    body: "We may update these Terms. Continued use after an update, or a new acceptance checkbox, constitutes agreement to the current version.",
  },
  {
    title: "10. Contact",
    body: "Questions: ayoub@flavorexperts.net",
  },
];

const AR: TermsSection[] = [
  {
    title: "1. قبول الشروط",
    body: "شبكة خبراء النكهات منصة تعليمية ومهنية لعلوم النكهات وتكنولوجيا الأغذية. إنشاء حساب أو استخدام الموقع يعني أنك قرأت هذه الشروط وفهمتها ووافقت عليها. إذا لم توافق فلا تستخدم المنصة.",
  },
  {
    title: "2. الغرض التعليمي",
    body: "المنصة مخصّصة فقط للتعلّم المهني، وتبادل المعرفة العلمية، وأخبار صناعة النكهات والأغذية، والوظائف، وتعاون الشركات. ليست منصة سياسية أو ترفيهية أو للمحتوى الجنسي.",
  },
  {
    title: "3. محتوى محظور حظراً تاماً — لا تسامح",
    body: "يُمنع منعاً باتاً في أي منشور أو تعليق أو رسالة أو وظيفة أو ملف شخصي أو رابط: (1) الأخبار السياسية، والدعاية السياسية، والنقاش السياسي، أو أي محتوى عن الحكومات أو الأحزاب أو الانتخابات. (2) أي محتوى يخص الأطفال — بما في ذلك الصور أو القصص أو النقاشات أو الروابط. هذه شبكة تعليم مهني للبالغين. (3) المواد الإباحية أو الجنسية أو العارية أو أي محتوى للبالغين. هذه القواعد مطلقة. المخالفة الجسيمة الأولى قد تؤدي إلى إيقاف الحساب نهائياً فوراً.",
  },
  {
    title: "4. السلوك المهني",
    body: "يلتزم الأعضاء بالاحترام والدقة والطابع العلمي. يُحظر التحرش وخطاب الكراهية والرسائل المزعجة وانتحال الهوية وسرقة الصيغ السرية والادعاءات التجارية المضللة.",
  },
  {
    title: "5. العضوية",
    body: "المنصة مجانية حالياً للأفراد والشركات. الوصول لا يعطي حق نشر محتوى محظور.",
  },
  {
    title: "6. التنفيذ",
    body: "يجوز حذف المحتوى وإيقاف أو حذف الحسابات المخالفة دون إشعار مسبق. المخالفات الجسيمة تُبلَّغ للجهات المختصة عند وجوب القانون.",
  },
  {
    title: "7. الملكية الفكرية",
    body: "لا تنشر مادة لا تملك حق مشاركتها. هوية المنصة والبرمجيات ملك لنا.",
  },
  {
    title: "8. الخصوصية",
    body: "نجمع بيانات الحساب لتشغيل الخدمة التعليمية فقط. راجع سياسة الخصوصية. لا نبيع بياناتك.",
  },
  {
    title: "9. التعديلات",
    body: "قد نحدّث هذه الشروط. استمرار الاستخدام بعد التحديث، أو الموافقة عبر مربع الاختيار، يعني قبول النسخة الحالية.",
  },
  {
    title: "10. التواصل",
    body: "للاستفسار: ayoub@flavorexperts.net",
  },
];

export function getTermsSections(lang: Language): TermsSection[] {
  return lang === "ar" ? AR : EN;
}

export function termsPlainText(lang: Language): string {
  return getTermsSections(lang)
    .map((section) => `${section.title}\n${section.body}`)
    .join("\n\n");
}

export function termsEmailHtml(lang: "ar" | "en"): string {
  const sections = lang === "ar" ? AR : EN;
  const title = lang === "ar" ? "الشروط والأحكام — نسخة كاملة" : "Terms & Conditions — full copy";
  const items = sections
    .map(
      (section) =>
        `<p style="margin:0 0 8px;font-weight:700;color:#002D54">${section.title}</p><p style="margin:0 0 16px;color:#374151;line-height:1.7">${section.body}</p>`,
    )
    .join("");
  return `<div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;padding:16px 18px;margin:16px 0"><p style="margin:0 0 12px;font-weight:700">${title}</p>${items}</div>`;
}
