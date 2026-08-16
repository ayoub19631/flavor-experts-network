import { useState, useRef, useEffect, useCallback } from "react";
import {
  X, Send, Loader2, Sparkles, RotateCcw,
  Copy, Check, Minimize2, Maximize2, User, Bot,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SITE } from "@/lib/site-config";
import BrandLogo from "@/components/BrandLogo";
import { useI18n } from "@/lib/i18n";

// ─── Platform Knowledge System Prompt ────────────────────────────────────────
const SYSTEM_PROMPT = `You are "FlavorBot" (فليفربوت), the official AI assistant for Flavor Experts Network (شبكة خبراء النكهات / FEN). You are embedded directly in the platform website and represent the brand with professionalism and warmth.

## Platform Overview
Flavor Experts Network is a professional community connecting flavor scientists, food technologists, R&D professionals, sensory experts, and ingredient suppliers worldwide.

## Website Pages & Navigation
- **/** — Home page (hero, features, testimonials, news preview)
- **/auth** — Login & Registration (individual or company) — fully free
- **/dashboard** — Member dashboard (after login)
- **/members** — Member directory
- **/jobs** — Job board (free for members; companies post for free)
- **/enterprise** — Enterprise / company services page (free to inquire)
- **/terms** — Terms of service
- **/privacy** — Privacy policy
- **/blog** — Industry blog & articles

## Membership (Exact)
The platform is **fully free** for individuals and companies. There are no paid subscription plans, no checkout, and no membership fees.
Members get full access to:
- News, articles, and educational resources
- Community, forum, and members directory
- Jobs (browse/apply); company accounts can post jobs
- Courses, consultations, and market tools
- Company services inquiries via /enterprise

## Registration Process
1. Go to /auth on the platform
2. Choose: Individual Account or Company Account
3. For individuals: name, email, password, specialty
4. For companies: company name, industry, size, contact info
5. Verify email via 6-digit OTP code sent to inbox
6. Optionally sign in with LinkedIn for quick access

## Payments
- No payments or subscriptions are required
- The entire platform is free for all account types

## Platform Features Detail
### Member Directory
- Browse expert profiles with specialties, bio, LinkedIn, skills, and cover photos
- Filter by specialty, location, and recommended members
- Send free professional connection requests between members
- See similar professionals by shared skills

### Industry News
- Real-time flavor & food industry news
- Admin-curated articles
- Shareable blog posts

### Educational Resources
- Research papers & scientific studies
- Practical guides & tutorials
- Webinar recordings archive

### Webinars
- Live weekly webinars with global experts
- On-demand replay library
- Interactive Q&A sessions

### Enterprise Services
- Brand visibility to industry professionals
- Targeted recruitment & partnerships
- Custom reporting dashboard
- White-label content opportunities

## Technical Support
- Email: ${SITE.supportEmail}
- Response within 24 hours
- Common issues: login problems, email verification, profile setup

## Flavor Science Knowledge Base
You are also an expert in flavor science. Topics you can address:
- **Flavor Chemistry**: esters, aldehydes, ketones, lactones, furans, pyrazines, terpenes, sulfur compounds
- **Maillard Reaction**: mechanism, products, applications in baking/roasting/frying
- **Encapsulation**: spray drying, coacervation, liposome encapsulation, cyclodextrin
- **Sensory Evaluation**: triangle test, descriptive analysis, hedonic scaling, QDA, TDS
- **Natural vs Artificial Flavors**: regulatory definitions, GRAS status, consumer trends
- **Regulatory Compliance**: FDA GRAS, EU Flavor Regulations (EC 1334/2008), JECFA
- **Flavor Stability**: oxidation, hydrolysis, Maillard browning, packaging interactions
- **Masking & Enhancement**: bitter masking, salt enhancement, sweetness modulation
- **Essential Oils**: extraction methods (steam distillation, CO2, cold press), GC-MS analysis
- **Taste Receptors**: TRPV1 (capsaicin), TAS2R (bitter), T1R2/T1R3 (sweet), umami
- **Fermentation Flavors**: lactic acid bacteria, yeast metabolites, aged cheese notes
- **Beverage Flavors**: coffee (pyrazines, furans), tea (catechins, terpenes), wine (esters, terpenes)
- **Meat & Savory**: reaction flavors, HVP, yeast extracts, MSG alternatives
- **Confectionery**: vanilla extraction, caramel formation, fruit flavor creation
- **Plant-Based Proteins**: off-flavors (beany, grassy), masking strategies

## Language Rules
CRITICAL: Always respond in the SAME language as the user's most recent message.
- Arabic message → Full Arabic response
- English message → Full English response  
- Mixed → Follow the dominant language
- Never explain that you're switching languages

## Response Format
- Keep responses concise but complete (max 250 words)
- Use emojis appropriately for friendliness (not excessively)
- Use bullet points for lists
- Bold key terms with **text**
- End with a helpful follow-up question or suggestion
- If asked about pricing, clearly state the platform is fully free
- For technical issues, always provide the support email

## Brand Voice
Professional yet warm, knowledgeable but approachable. You're proud of the platform and genuinely want to help users succeed. Never sound robotic.`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ─── Smart Fallback (no API key required) ────────────────────────────────────
function getSmartFallback(input: string, preferredLang: "ar" | "en" = "en"): string {
  const m = input.toLowerCase();
  const hasArabic = /[\u0600-\u06FF]/.test(input);
  const hasLatin = /[a-z]/i.test(input);
  // Prefer explicit script in the message; otherwise follow site language
  const isAr = hasArabic && !hasLatin ? true : hasLatin && !hasArabic ? false : preferredLang === "ar";

  // Pricing / membership
  if (/price|pricing|cost|plan|subscription|package|اشتراك|سعر|تكلفة|خطة|باقة|اسعار|مجاني|free/.test(m)) {
    return isAr
      ? `المنصة **مجانية بالكامل** للأفراد والشركات 🎉\n\nلا توجد خطط مدفوعة ولا اشتراكات.\nبعد إنشاء حساب مجاني تحصل على:\n• الأخبار والموارد التعليمية\n• المجتمع والمنتدى ودليل الأعضاء\n• الوظائف (تصفح وتقديم)\n• الدورات والاستشارات والسوق\n• حسابات الشركات تنشر الوظائف مجاناً\n\nابدأ من **/auth**\nهل تريد مساعدة في التسجيل؟`
      : `The platform is **fully free** for individuals and companies 🎉\n\nThere are no paid plans and no subscriptions.\nWith a free account you get:\n• News and educational resources\n• Community, forum, and members directory\n• Jobs (browse and apply)\n• Courses, consultations, and market\n• Company accounts can post jobs for free\n\nStart at **/auth**\nNeed help creating an account?`;
  }

  // Registration / signup
  if (/sign.?up|register|join|create.?account|how.?to.?join|تسجيل|انضم|إنشاء|اشترك|كيف أسجل|كيفية التسجيل/.test(m)) {
    return isAr
      ? `للتسجيل في المنصة بسهولة:\n\n1️⃣ اذهب إلى صفحة **/auth**\n2️⃣ اختر نوع الحساب: **فردي** أو **شركة**\n3️⃣ أدخل بياناتك (الاسم، البريد، كلمة المرور، التخصص)\n4️⃣ تحقق من بريدك برمز **OTP مكوّن من 6 أرقام**\n5️⃣ اختر **عملتك المفضلة** (32 خيار متاح)\n6️⃣ ابدأ الاستكشاف! 🚀\n\n🔗 يمكنك أيضاً الدخول مباشرةً عبر **LinkedIn**!\n\nهل تحتاج مساعدة في خطوة معينة؟`
      : `To join Flavor Experts Network:\n\n1️⃣ Go to **/auth** page\n2️⃣ Choose account type: **Individual** or **Company**\n3️⃣ Fill in your details (name, email, password, specialty)\n4️⃣ Verify email with a **6-digit OTP** sent to your inbox\n5️⃣ Select your **preferred currency**\n6️⃣ Start exploring! 🚀\n\n🔗 You can also **sign in with LinkedIn** instantly!\n\nNeed help with a specific step?`;
  }

  // Login / password
  if (/log.?in|sign.?in|forgot.?pass|reset.?pass|تسجيل دخول|نسيت كلمة|دخول|كلمة المرور/.test(m)) {
    return isAr
      ? `لتسجيل الدخول:\n\n1️⃣ اذهب إلى **/auth**\n2️⃣ أدخل بريدك الإلكتروني وكلمة المرور\n3️⃣ أو اضغط **تسجيل الدخول بـ LinkedIn** للدخول السريع\n\n**🔑 نسيت كلمة المرور؟**\nاضغط "نسيت كلمة المرور" في صفحة الدخول وسنرسل لك رابط استعادة فوراً.\n\nهل تواجه مشكلة معينة في الدخول؟`
      : `To log in:\n\n1️⃣ Go to **/auth**\n2️⃣ Enter your email & password\n3️⃣ Or click **Sign in with LinkedIn**\n\n**🔑 Forgot password?**\nClick "Forgot Password" on the login page — we'll send a reset link instantly.\n\nAre you having trouble with a specific issue?`;
  }

  // Features / what is the platform
  if (/feature|what.*platform|what.*do|about.*platform|ميزة|المنصة|ماذا|ما هو|عن المنصة|ما تقدم/.test(m)) {
    return isAr
      ? `شبكة خبراء النكهات تقدم:\n\n🔬 **دليل الأعضاء** — تصفح ملفات المتخصصين\n📰 **أخبار الصناعة** — آخر مستجدات قطاع النكهات\n📚 **الموارد التعليمية** — أوراق بحثية، أدلة، دروس\n🎥 **الندوات** — مباشرة ومسجلة مع خبراء\n🤝 **التواصل المهني** — اتصال مباشر مع متخصصين\n🏢 **خدمات المؤسسات** — إعلانات، شراكات، تقارير\n🌍 **متعدد اللغات** — عربي وإنجليزي\n\nأي ميزة تريد استعراضها أكثر؟`
      : `Flavor Experts Network offers:\n\n🔬 **Member Directory** — Browse expert profiles\n📰 **Industry News** — Latest flavor industry updates\n📚 **Educational Resources** — Research papers, guides, tutorials\n🎥 **Webinars** — Live & recorded sessions\n🤝 **Networking** — Direct connections with professionals\n🏢 **Enterprise Services** — Ads, partnerships, analytics\n🌍 **Multi-language** — Arabic & English\n\nWhich feature would you like to explore?`;
  }

  // Enterprise
  if (/enterprise|company.?plan|corporate|b2b|شركة|مؤسسة|شراكة|إعلان/.test(m)) {
    return isAr
      ? `خدمات الشركات متاحة **مجاناً** على المنصة:\n\n🏢 حساب شركة مجاني بالكامل\n📝 نشر وظائف وتحديثات الشركة\n🤝 الوصول للمجتمع ودليل الأعضاء\n📊 الموارد والأخبار الصناعية\n\nاطلب خدمات إضافية أو شراكات عبر **/enterprise**\n📧 ${SITE.supportEmail}\n\nهل تريد مساعدة في تسجيل حساب شركة؟`
      : `Company services are available **for free** on the platform:\n\n🏢 Fully free company accounts\n📝 Post jobs and company updates\n🤝 Community and members directory access\n📊 Industry resources and news\n\nRequest partnerships or extra services via **/enterprise**\n📧 ${SITE.supportEmail}\n\nNeed help creating a company account?`;
  }

  // Contact / support
  if (/contact|support|help|email|reach|problem|issue|تواصل|دعم|مساعدة|بريد|مشكلة/.test(m)) {
    return isAr
      ? `فريق الدعم جاهز لمساعدتك:\n\n📧 **البريد الإلكتروني:** ${SITE.supportEmail}\n🌐 **الموقع:** ${SITE.domain}\n⏱️ **وقت الرد:** خلال 24 ساعة\n\nنتعامل مع:\n• مشاكل تسجيل الدخول أو الحساب\n• المشاكل التقنية\n• استفسارات الشركات والشراكات\n\nهل يمكنني مساعدتك بأي استفسار محدد قبل التواصل معهم؟`
      : `Our support team is ready to help:\n\n📧 **Email:** ${SITE.supportEmail}\n🌐 **Website:** ${SITE.domain}\n⏱️ **Response time:** Within 24 hours\n\nWe handle:\n• Login & account issues\n• Technical problems\n• Company & partnership inquiries\n\nCan I help with a specific question before you contact support?`;
  }

  // Flavor science — Maillard
  if (/maillard|carameliz|browning|تفاعل ميلارد|كراميل|تحمير/.test(m)) {
    return isAr
      ? `تفاعل ميلارد هو أحد أهم تفاعلات الطهي في علم الغذاء:\n\n🔬 **الجوهر:** تفاعل كيميائي بين الأحماض الأمينية والسكريات المختزلة\n🌡️ **الحرارة المطلوبة:** 140-165°C (280-325°F)\n\n**منتجات التفاعل:**\n• مئات مركبات النكهة (بيرازينات، فورانات، ألدهيدات)\n• اللون البني المميز (ميلانويدين)\n• الروائح المعقدة في القهوة، الخبز، اللحوم\n\n**تحكم في التفاعل:**\n• pH قلوي يسرّع التفاعل\n• انخفاض رطوبة يعزز التحمير\n• تختلف عن الكرملة (سكريات فقط)\n\nهل تريد التعمق في تطبيقاتها الصناعية أو آلية التفاعل؟`
      : `The Maillard reaction is one of the most important reactions in food science:\n\n🔬 **Core:** Chemical reaction between amino acids and reducing sugars\n🌡️ **Temperature:** 140-165°C (280-325°F)\n\n**Reaction products:**\n• Hundreds of flavor compounds (pyrazines, furans, aldehydes)\n• Brown color (melanoidins)\n• Complex aromas in coffee, bread, roasted meat\n\n**Control factors:**\n• Alkaline pH accelerates the reaction\n• Lower water activity promotes browning\n• Distinct from caramelization (sugars only)\n\nWould you like to explore industrial applications or reaction mechanism in detail?`;
  }

  // Encapsulation
  if (/encapsulat|microencapsulat|تغليف|تحجيم|كبسلة/.test(m)) {
    return isAr
      ? `تقنيات تغليف النكهات الدقيق (Encapsulation):\n\n**الأهداف:**\n• حماية النكهات من الأكسدة والتحلل\n• التحرر المتحكم به (controlled release)\n• إخفاء المرارة أو الطعم غير المرغوب\n\n**التقنيات الرئيسية:**\n💨 **Spray Drying** — الأكثر شيوعاً، اقتصادي، إنتاج كبير\n🧬 **Coacervation** — لتغليف الزيوت، كفاءة عالية\n🔵 **Liposome** — تحكم دقيق، مكلفة\n💍 **Cyclodextrin** — مثالية للنكهات المتطايرة\n\n**مواد الجدار الشائعة:**\nGum Arabic, Modified Starch, Maltodextrin, HPMC\n\nهل تريد معرفة المزيد عن تقنية معينة أو تطبيقاتها في منتج محدد؟`
      : `Flavor Encapsulation Technologies:\n\n**Objectives:**\n• Protect flavors from oxidation & degradation\n• Controlled release mechanisms\n• Mask bitterness or undesirable notes\n\n**Key Technologies:**\n💨 **Spray Drying** — Most common, economical, high volume\n🧬 **Coacervation** — For oils, high efficiency\n🔵 **Liposome** — Precise control, higher cost\n💍 **Cyclodextrin** — Ideal for volatile flavor compounds\n\n**Common Wall Materials:**\nGum Arabic, Modified Starch, Maltodextrin, HPMC\n\nWould you like to explore a specific technique or its application in a product?`;
  }

  // Sensory evaluation
  if (/sensory|taste.?test|triangle.?test|hedonic|panel|تقييم حسي|اختبار طعم|لجنة تذوق/.test(m)) {
    return isAr
      ? `التقييم الحسي — أساس تطوير النكهات:\n\n**الطرق الرئيسية:**\n🔺 **Triangle Test** — كشف الفروق بين عينتين\n📊 **QDA** (Quantitative Descriptive Analysis) — وصف وقياس دقيق\n❤️ **Hedonic Scaling** — قياس مدى الإعجاب (9-point scale)\n⏱️ **TDS** (Temporal Dominance) — تتبع السمات بالزمن\n🔬 **Descriptive Analysis** — لجنة مدربة تصف السمات\n\n**بروتوكولات جوهرية:**\n• ضبط الإضاءة والحرارة وترتيب التقديم\n• carryover effect — تنظيف الحنك بين العينات\n• إحصاء ANOVA/MANOVA للنتائج\n\nهل تحتاج معلومات عن منهجية محددة أو كيفية تشكيل لجنة تذوق؟`
      : `Sensory Evaluation — the foundation of flavor development:\n\n**Key Methods:**\n🔺 **Triangle Test** — Detecting differences between samples\n📊 **QDA** (Quantitative Descriptive Analysis) — Precise profiling\n❤️ **Hedonic Scaling** — Preference measurement (9-point scale)\n⏱️ **TDS** (Temporal Dominance) — Tracking attributes over time\n🔬 **Descriptive Analysis** — Trained panel profiling\n\n**Essential Protocols:**\n• Control lighting, temperature, sample order\n• Palate cleansing between samples\n• ANOVA/MANOVA statistical analysis\n\nNeed info on a specific methodology or panel setup?`;
  }

  // Currency / money questions → free platform
  if (/currency|currenc|عملة|عملات|دولار|درهم|ريال|payment|دفع|فاتورة/.test(m)) {
    return isAr
      ? `المنصة **مجانية بالكامل** — لا مدفوعات ولا عملات مطلوبة للاستخدام.\n\nأنشئ حساباً مجانياً من **/auth** وابدأ فوراً.\nهل تحتاج مساعدة في التسجيل؟`
      : `The platform is **fully free** — no payments or currencies are required to use it.\n\nCreate a free account at **/auth** and get started.\nNeed help registering?`;
  }

  // Arabic default
  if (isAr) {
    return `شكراً على سؤالك! أنا **FlavorBot** 🤖، مساعذك الذكي في شبكة خبراء النكهات.\n\nيمكنني مساعدتك في:\n🆓 العضوية المجانية · 📝 التسجيل · 🔬 ميزات المنصة\n🏢 خدمات الشركات · 📧 الدعم التقني · 🌿 علم النكهات\n\nما الذي تودّ معرفته بالتحديد؟`;
  }

  // English default
  return `Thanks for reaching out! I'm **FlavorBot** 🤖, the AI assistant for Flavor Experts Network.\n\nI can help you with:\n🆓 Free membership · 📝 Registration · 🔬 Platform features\n🏢 Company services · 📧 Technical support · 🌿 Flavor science\n\nWhat would you like to know?`;
}

// ─── OpenAI via Supabase Edge Function (key stays server-side) ───────────────
async function callAI(
  history: Array<{ role: string; content: string }>,
  language: "ar" | "en",
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("flavorbot", {
      body: { messages: history.slice(-12), language },
    });
    if (error || !data?.content) return "";
    return String(data.content).trim();
  } catch {
    return "";
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const WELCOME_MSG_AR = `مرحباً! أنا **FlavorBot** 🤖✨\n\nمساعدك الذكي الرسمي في **شبكة خبراء النكهات**.\n\nيمكنني مساعدتك في:\n• العضوية المجانية الكاملة 🆓\n• التسجيل واستخدام المنصة 📝\n• علم النكهات والغذاء 🔬\n• خدمات الشركات والشراكات 🏢\n\nاكتب سؤالك بالعربي أو الإنجليزي وسأجيبك فوراً 😊`;

const WELCOME_MSG_EN = `Hello! I'm **FlavorBot** 🤖✨\n\nYour official AI assistant for **Flavor Experts Network**.\n\nI can help you with:\n• Fully free membership 🆓\n• Registration & platform navigation 📝\n• Flavor science & food technology 🔬\n• Company services & partnerships 🏢\n\nAsk me anything in Arabic or English! 😊`;

// Detect browser language for welcome message
const initialWelcome = () =>
  (typeof navigator !== "undefined" && navigator.language?.startsWith("ar")
    ? WELCOME_MSG_AR
    : WELCOME_MSG_EN);

const QUICK_CHIPS_AR = [
  { label: "🆓 مجاني؟", q: "هل المنصة مجانية بالكامل؟" },
  { label: "📝 التسجيل", q: "كيف أسجل في المنصة؟" },
  { label: "🏢 الشركات", q: "ما هي خدمات الشركات؟" },
  { label: "🔬 علم النكهات", q: "ما هي مجالات علم النكهات؟" },
  { label: "⭐ المميزات", q: "ما هي ميزات المنصة؟" },
  { label: "📧 الدعم", q: "كيف أتواصل مع الدعم التقني؟" },
];

const QUICK_CHIPS_EN = [
  { label: "🆓 Free?", q: "Is the platform fully free?" },
  { label: "📝 Register", q: "How do I register on the platform?" },
  { label: "🏢 Companies", q: "What company services do you offer?" },
  { label: "🔬 Flavor Science", q: "What flavor science topics can you help with?" },
  { label: "⭐ Features", q: "What are the platform features?" },
  { label: "📧 Support", q: "How do I contact technical support?" },
];

// ─── Markdown Renderer ────────────────────────────────────────────────────────
function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line === "") return <div key={i} className="h-2" />;

    // Process bold (**text**)
    const parts = line.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      return <span key={j}>{part}</span>;
    });

    return (
      <p key={i} className="leading-relaxed">
        {parts}
      </p>
    );
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatAssistant() {
  const { lang, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: initialWelcome(), timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [hasOpened, setHasOpened] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const welcomeForLang = lang === "ar" ? WELCOME_MSG_AR : WELCOME_MSG_EN;
  const isRTL = dir === "rtl" || lang === "ar";

  // Sync chatbot UI + welcome message with site language
  useEffect(() => {
    setMessages((prev) => {
      const nextWelcome = {
        id: "welcome",
        role: "assistant" as const,
        content: welcomeForLang,
        timestamp: new Date(),
      };
      if (prev.length === 0) return [nextWelcome];
      if (prev.length === 1 && prev[0].id === "welcome") return [nextWelcome];
      return prev.map((m) => (m.id === "welcome" ? { ...m, content: welcomeForLang } : m));
    });
  }, [welcomeForLang]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (open && !minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, open, minimized]);

  // Focus input when opened
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, minimized]);

  // Unread counter
  useEffect(() => {
    if (!open && hasOpened) {
      const last = messages[messages.length - 1];
      if (last?.role === "assistant" && last.id !== "welcome") {
        setUnread(n => n + 1);
      }
    }
    if (open) setUnread(0);
  }, [messages, open, hasOpened]);

  const handleOpen = () => {
    setOpen(true);
    setHasOpened(true);
    setUnread(0);
  };

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== "welcome")
        .concat(userMsg)
        .map(m => ({ role: m.role, content: m.content }));

      let reply = await callAI(history, lang);
      if (!reply) reply = getSmartFallback(content, lang);

      const botMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: getSmartFallback(content, lang),
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, lang]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const copyMsg = (id: string, content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const clearChat = () => {
    setMessages([{ id: "welcome", role: "assistant", content: welcomeForLang, timestamp: new Date() }]);
  };

  const fmt = (d: Date) =>
    d.toLocaleTimeString(lang === "ar" ? "ar" : "en", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const QUICK_CHIPS = lang === "ar" ? QUICK_CHIPS_AR : QUICK_CHIPS_EN;
  const placeholder = lang === "ar" ? "اكتب سؤالك هنا..." : "Type your question here...";
  const poweredBy = lang === "ar" ? "مدعوم بالذكاء الاصطناعي · شبكة خبراء النكهات" : "Powered by AI · Flavor Experts Network";
  const onlineLabel = lang === "ar" ? "متصل · يرد فورياً" : "Online · Instant replies";
  const fabLabel = lang === "ar" ? "مساعد ذكي" : "AI Assistant";
  const clearLabel = lang === "ar" ? "مسح المحادثة" : "Clear chat";
  const expandLabel = lang === "ar" ? "توسيع" : "Expand";
  const minimizeLabel = lang === "ar" ? "تصغير" : "Minimize";
  const closeLabel = lang === "ar" ? "إغلاق" : "Close";
  const typingLabel = lang === "ar" ? "يكتب..." : "Typing...";

  const showChips = messages.length <= 2 && !loading;

  return (
    <>
      {/* ══ Floating trigger button ══════════════════════════════════════════ */}
      <button
        onClick={handleOpen}
        aria-label={fabLabel}
        className={`
          fixed bottom-6 z-[9999] flex items-center gap-2.5 px-4 py-3
          rounded-2xl bg-primary text-primary-foreground font-semibold text-sm
          shadow-xl shadow-primary/40
          transition-all duration-300 ease-out
          hover:scale-105 hover:shadow-2xl hover:shadow-primary/50
          active:scale-95
          ${isRTL ? "left-6 right-auto" : "right-6"}
          ${open ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"}
        `}
      >
        <div className="relative flex-shrink-0">
          <MessageCircle className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
        </div>
        <span>{fabLabel}</span>
        {unread > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-5 h-5 rounded-full flex items-center justify-center font-bold px-1">
            {unread}
          </span>
        )}
      </button>

      {/* ══ Chat panel ═══════════════════════════════════════════════════════ */}
      <div
        role="dialog"
        aria-label={`${fabLabel} — FlavorBot`}
        className={`
          fixed bottom-6 z-[9999] flex flex-col
          bg-background border border-border rounded-2xl shadow-2xl
          transition-all duration-300 ease-out
          ${isRTL ? "left-6 right-auto origin-bottom-left" : "right-6 origin-bottom-right"}
          ${open ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"}
          ${minimized ? "h-[54px] w-80 max-w-[calc(100vw-3rem)] overflow-hidden" : "w-[min(380px,calc(100vw-3rem))] h-[600px] max-h-[90vh]"}
        `}
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 bg-primary rounded-t-2xl flex-shrink-0">
          {/* Avatar */}
          <div className="relative w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-white/25">
            <BrandLogo size="sm" className="h-9 w-9 rounded-none shadow-none ring-0" />
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm leading-tight">
              {lang === "ar" ? "فليفربوت" : "FlavorBot"}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-white/75">{onlineLabel}</span>
            </div>
          </div>
          {/* Controls */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={clearChat}
              title={clearLabel}
              className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white/75" />
            </button>
            <button
              onClick={() => setMinimized(m => !m)}
              title={minimized ? expandLabel : minimizeLabel}
              className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              {minimized
                ? <Maximize2 className="w-3.5 h-3.5 text-white/75" />
                : <Minimize2 className="w-3.5 h-3.5 text-white/75" />}
            </button>
            <button
              onClick={() => setOpen(false)}
              title={closeLabel}
              className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white/75" />
            </button>
          </div>
        </div>

        {!minimized && (
          <>
            {/* ── Messages ──────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth" dir="auto">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5 ${
                    msg.role === "assistant" ? "bg-primary/10" : "bg-secondary"
                  }`}>
                    {msg.role === "assistant"
                      ? <Bot className="w-4 h-4 text-primary" />
                      : <User className="w-3.5 h-3.5 text-muted-foreground" />
                    }
                  </div>
                  {/* Bubble */}
                  <div className={`group flex flex-col gap-1 max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${
                      msg.role === "assistant"
                        ? "bg-secondary/50 text-foreground rounded-tl-sm border border-border/40"
                        : "bg-primary text-primary-foreground rounded-tr-sm"
                    }`}>
                      <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
                    </div>
                    {/* Meta */}
                    <div className={`flex items-center gap-2 px-1 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <span className="text-[10px] text-muted-foreground">{fmt(msg.timestamp)}</span>
                      {msg.role === "assistant" && (
                        <button
                          onClick={() => copyMsg(msg.id, msg.content)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                          title="نسخ"
                        >
                          {copied === msg.id
                            ? <Check className="w-3 h-3 text-emerald-500" />
                            : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-secondary/50 border border-border/40 px-4 py-3 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1.5 items-center h-4">
                      <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "0.8s" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "160ms", animationDuration: "0.8s" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "320ms", animationDuration: "0.8s" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Quick action chips ────────────────────────────────────── */}
            {showChips && (
              <div className="px-3 pb-2.5 flex flex-wrap gap-1.5 flex-shrink-0 border-t border-border/40 pt-2.5">
                {QUICK_CHIPS.map(c => (
                  <button
                    key={c.label}
                    onClick={() => sendMessage(c.q)}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-primary/8 text-primary hover:bg-primary/15 transition-colors border border-primary/20 font-medium"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Input area ───────────────────────────────────────────── */}
            <div className="p-3 border-t border-border flex-shrink-0">
              <div className="flex gap-2 items-center bg-secondary/40 rounded-xl px-3 py-2 border border-border focus-within:border-primary/50 transition-colors">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={placeholder}
                  disabled={loading}
                  dir="auto"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0 disabled:opacity-60"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
                >
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />}
                </button>
              </div>

              {/* Powered by */}
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <Sparkles className="w-3 h-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">{poweredBy}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
