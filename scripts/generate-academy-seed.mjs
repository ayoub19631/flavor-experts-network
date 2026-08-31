import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const COURSE = "11111111-1111-4111-8111-111111111111";
const q = (value) => `'${String(value).replace(/'/g, "''")}'`;
const jsonb = (value) => q(JSON.stringify(value));

const disclaimer =
  "Teaching Prototype — For supervised R&D training and evaluation only. Verify food-grade status, supplier specifications, intended application, and applicable EU, USA, and India requirements. This formula is not commercially approved.";
const disclaimerAr =
  "نموذج تعليمي — للتدريب والتقييم في البحث والتطوير تحت إشراف فقط. تحقق من صلاحية الدرجة الغذائية ومواصفات المورّد والاستخدام المقصود ومتطلبات الاتحاد الأوروبي والولايات المتحدة والهند. هذه الصيغة ليست معتمدة تجارياً.";

const modules = [
  {
    title: "The Language of Flavor",
    titleAr: "لغة النكهة",
    objective: "Define flavor as chemistry plus perception and map industry roles.",
    objectiveAr: "تعريف النكهة بوصفها كيمياء وإدراكاً، وفهم أدوار الصناعة.",
    lessons: [
      {
        title: "What flavor actually is",
        titleAr: "ما هي النكهة فعلاً",
        minutes: 9,
        objective: "Separate taste, aroma, trigeminal effect, and context.",
        objectiveAr: "التمييز بين الطعم والرائحة والإحساس الثلاثي التوائم والسياق.",
        body: `Flavor is not a single molecule and not a marketing adjective. In professional practice it is the combined experience of taste, aroma, chemesthesis, and the food system that carries them.

Taste covers sweet, sour, salty, bitter, and umami. Aroma is the larger vocabulary: esters, aldehydes, sulfur notes, pyrazines, lactones, and many more. The trigeminal system adds burn, cooling, tingling, and astringency.

A strawberry flavor for yogurt is therefore a different technical problem from a strawberry flavor for a hard candy. The same named profile must be rebuilt for water activity, fat, pH, process heat, and legal status.`,
        bodyAr: `النكهة ليست جزيئاً واحداً وليست صفة تسويقية. في الممارسة المهنية هي تجربة مركّبة من الطعم والرائحة والإحساس الكيميائي ونظام الغذاء الذي يحملها.

يشمل الطعم الحلاوة والحموضة والملوحة والمرارة والأومامي. أما الرائحة فهي المفردات الأوسع. ويضيف الجهاز الثلاثي التوائم الحرارة والبرودة والنخز والقباضة.

لذلك فإن نكهة فراولة للزبادي مشكلة تقنية مختلفة عن نكهة فراولة للحلويات الصلبة. يجب إعادة بناء نفس الاسم حسب النشاط المائي والدهن ودرجة الحموضة والحرارة والحالة التنظيمية.`,
        example: `A client asks for “fresh lemon.” A junior mistake is to add only citral. A better first model is: a citrus peel top (limonene teaching code TP-LIM-001), a juicy aldehyde accent, a small sour taste support in the application, and a check against heat if the drink will be pasteurized.`,
        exampleAr: `يطلب العميل «ليموناً طازجاً». الخطأ الشائع هو إضافة السترال فقط. النموذج الأفضل يبدأ بقشرة حمضيات، ولمسة ألدهيدية، ودعم حامض في التطبيق، ثم فحص الحرارة إذا كان المشروب سيبستر.`,
        check: {
          question: "Which statement is professionally accurate?",
          options: [
            "Flavor is only the sweet taste of a product",
            "Flavor is aroma + taste + chemesthesis inside a specific food system",
            "Any lemon aroma chemical is commercially approved for every country",
            "A teaching formula can be sold as a finished flavor",
          ],
          correct_index: 1,
          explanation: "Flavor is a system-level perception problem, not a single raw material.",
        },
        summary: "Flavor = taste + aroma + trigeminal effect + application. Named profiles must be rebuilt for each base.",
        summaryAr: "النكهة = طعم + رائحة + إحساس ثلاثي + تطبيق. يجب إعادة بناء الملف لكل قاعدة.",
      },
      {
        title: "How flavor teams work",
        titleAr: "كيف تعمل فرق النكهات",
        minutes: 8,
        objective: "Identify the brief, lab, sensory, regulatory, and application loop.",
        objectiveAr: "فهم حلقة الموجز والمختبر والحسي والتنظيمي والتطبيق.",
        body: `A professional flavor project usually moves through a brief, a hypothesis, a first weighing, a coded sensory check, a documented revision, and a recommendation with limitations.

The brief should state the application, process, target consumers, forbidden notes, cost band, and any religious or regional constraints. The laboratory converts that into a 100% formula with material codes and versions.

This Academy treats every bench formula as a teaching prototype. It is for supervised R&D training and evaluation only.`,
        bodyAr: `يمر مشروع النكهة المهني عادة بالموجز، ثم الفرضية، ثم الوزن الأول، ثم تقييم حسي مرمّز، ثم مراجعة موثّقة، ثم توصية مع ذكر الحدود.

يجب أن يذكر الموجز التطبيق والعملية والمستهلك المستهدف والنوتات الممنوعة ونطاق التكلفة وأي قيود إقليمية. ويحوّل المختبر ذلك إلى صيغة 100٪ برموز مواد وإصدارات.

تعامل هذه الأكاديمية كل صيغة مختبرية كنموذج تعليمي تحت إشراف فقط.`,
        example: `Roles: flavorist (composition), application specialist (the food), sensory lead (coded evaluation), regulatory (status and use level), and project owner (decision). Students practice all five in miniature.`,
        exampleAr: `الأدوار: مركّب النكهة، أخصائي التطبيق، قائد التقييم الحسي، المسؤول التنظيمي، وصاحب القرار. يتدرّب الطالب على الخمسة بشكل مصغّر.`,
        check: {
          question: "What must a useful flavor brief include?",
          options: [
            "Only a favorite brand name",
            "Application, process, constraints, and success criteria",
            "A commercially approved finished SKU",
            "A political or entertainment story",
          ],
          correct_index: 1,
        },
        summary: "Brief → hypothesis → weigh → coded sensory → revision → recommendation with limits.",
        summaryAr: "موجز → فرضية → وزن → تقييم مرمّز → مراجعة → توصية مع حدود.",
      },
    ],
    quiz: [
      ["Flavor is best described as", ["Only sweetness", "A system of taste, aroma, and context", "A trademark", "A finished commercial SKU"], 1],
      ["A teaching prototype may be", ["Sold as approved", "Used without checking food-grade status", "Used for supervised training only", "Copied onto a customer COA"], 2],
      ["The application base matters because", ["It never changes perception", "Heat, fat, and pH reshape the same formula", "All drinks behave like candy", "Regulations are identical worldwide"], 1],
    ],
  },
  {
    title: "Raw Materials and Building Blocks",
    titleAr: "المواد الخام ولبنات البناء",
    objective: "Classify naturals, extracts, isolates, and aroma chemicals as teaching materials.",
    objectiveAr: "تصنيف الطبيعيات والمستخلصات والمعزولات وكيماويات الرائحة كمواد تعليمية.",
    lessons: [
      {
        title: "Naturals, extracts, and isolates",
        titleAr: "الطبيعيات والمستخلصات والمعزولات",
        minutes: 10,
        objective: "Read a material class without treating the name as a formula.",
        objectiveAr: "قراءة فئة المادة دون اعتبار الاسم صيغة.",
        body: `Orange oil, vanilla extract, and menthol isolate are not interchangeable “naturals.” They differ in composition, solvent, residual volatiles, color, and regulatory listing.

In this course every material receives a teaching code such as TP-ORJ-001. The code is not a supplier SKU and does not prove food-grade status. Students must still check the real specification in a supervised lab.`,
        bodyAr: `زيت البرتقال ومستخلص الفانيليا والمنثول المعزول ليست «طبيعيات» قابلة للتبديل. تختلف في التركيب والمذيب والمتبقيات واللون والقائمة التنظيمية.

في هذه الدورة تأخذ كل مادة رمزاً تعليمياً مثل TP-ORJ-001. الرمز ليس رقم مورّد ولا يثبت الدرجة الغذائية.`,
        example: `TP-VAN-010 might represent a folded vanilla extract used at 2.00% in a teaching cream flavor. The 2.00% is a classroom starting point, not a commercial use level.`,
        exampleAr: `قد يمثّل TP-VAN-010 مستخلص فانيليا مطوياً بنسبة 2.00٪ في نكهة كريمة تعليمية. هذه نقطة بداية صفّية وليست مستوى استخدام تجاري.`,
        check: {
          question: "A teaching material code means",
          options: [
            "The item is commercially approved worldwide",
            "A classroom identity that still needs specification checks",
            "The formula can be manufactured at scale",
            "EU, USA, and India already accept the use",
          ],
          correct_index: 1,
        },
        summary: "Class the material, code it, and never skip specification and status checks.",
        summaryAr: "صنّف المادة، رمزها، ولا تتخطَّ فحص المواصفة والحالة التنظيمية.",
      },
      {
        title: "Aroma chemicals and balance",
        titleAr: "كيماويات الرائحة والتوازن",
        minutes: 9,
        objective: "Use character, modifier, and blender roles in a teaching stack.",
        objectiveAr: "استخدام أدوار الطابع والمعدّل والمازج في مجموعة تعليمية.",
        body: `A practical stack has character items (the recognizable note), modifiers (fresh, ripe, cooked, creamy), and blenders/solvents that make the mix weighable and stable enough for class.

High-impact sulfur or pyrazine items are used at very low teaching percentages. If a material is too strong to weigh on the available balance, it is pre-diluted and the dilution version is written on the formula.`,
        bodyAr: `المجموعة العملية تشمل مواد الطابع، والمعدّلات، والمازجات/المذيبات التي تجعل الخلطة قابلة للوزن ومستقرة بما يكفي للصف.

تستخدم مواد الكبريت أو البيرازين عالية الأثر بنسب تعليمية منخفضة جداً. إذا تعذّر الوزن تُمدَّد مسبقاً ويُكتب إصدار التخفيف على الصيغة.`,
        example: `Citrus teaching stack: TP-LIM-001 40.00, TP-CIT-002 8.00, TP-ALD-004 1.20, TP-VAN-010 0.80, solvent to 100.00. Still a teaching prototype.`,
        exampleAr: `مجموعة حمضيات تعليمية: TP-LIM-001 ‏40.00، TP-CIT-002 ‏8.00، TP-ALD-004 ‏1.20، TP-VAN-010 ‏0.80، والمذيب حتى 100.00. ما تزال نموذجاً تعليمياً.`,
        check: {
          question: "Why pre-dilute a high-impact material?",
          options: [
            "To hide it from regulatory review",
            "To make a weighable, versioned teaching addition",
            "To claim commercial approval",
            "To skip PPE",
          ],
          correct_index: 1,
        },
        summary: "Character + modifier + blender. Version dilutions. Keep the 100% total honest.",
        summaryAr: "طابع + معدّل + مازج. وثّق التخفيفات. اجعل مجموع 100٪ صادقاً.",
      },
    ],
    quiz: [
      ["Teaching codes are", ["Supplier SKUs", "Classroom identities pending real specs", "Proof of food-grade status", "Export certificates"], 1],
      ["A blender or solvent is used to", ["Replace sensory evaluation", "Make the formula weighable and complete 100%", "Approve the product", "Avoid documentation"], 1],
      ["High-impact materials should be", ["Dumped at 20%", "Pre-diluted and versioned when needed", "Ignored", "Called commercially approved"], 1],
    ],
  },
  {
    title: "Sensory Science Foundations",
    titleAr: "أسس علم التقييم الحسي",
    objective: "Run a coded, bias-aware tasting appropriate for training.",
    objectiveAr: "إجراء تذوق مرمّز يراعي التحيّز ومناسب للتدريب.",
    lessons: [
      {
        title: "Thresholds, adaptation, and bias",
        titleAr: "العتبات والتكيّف والتحيّز",
        minutes: 8,
        objective: "Explain why uncoded “I like it” is not a result.",
        objectiveAr: "شرح لماذا عبارة «أعجبني» غير المرمّزة ليست نتيجة.",
        body: `Sensory work fails when the taster sees the brand, the formula number they prefer, or the colleague who made the sample. Training uses coded cups, a defined lexicon, palate cleansers, and a written ballot.

Adaptation dulls a note after repeated sniffing. Thresholds differ by person. Therefore one enthusiastic opinion is not a release decision.`,
        bodyAr: `يفشل العمل الحسي عندما يرى المتذوق العلامة أو رقم الصيغة المفضّل أو اسم الزميل. يستخدم التدريب أكواباً مرمّزة ومعجماً محدداً ومنظفات للحلق واستمارة مكتوبة.`,
        example: `Ballot line: sample 247 vs 248, score citrus peel 0–5, score cooked 0–5, write one defect, do not discuss until all scores are in.`,
        exampleAr: `سطر الاستمارة: العينة 247 مقابل 248، قشّرة حمضيات 0–5، مطبوخ 0–5، عيب واحد، بلا نقاش قبل جمع الدرجات.`,
        check: {
          question: "Coded evaluation is used to",
          options: [
            "Hide unsafe samples",
            "Reduce expectation bias",
            "Skip documentation",
            "Approve a commercial launch",
          ],
          correct_index: 1,
        },
        summary: "Code samples, define attributes, write scores, then discuss.",
        summaryAr: "رمّز العينات، حدّد الصفات، اكتب الدرجات، ثم ناقش.",
      },
      {
        title: "Lexicons and coded comparison",
        titleAr: "المعاجم والمقارنة المرمّزة",
        minutes: 7,
        objective: "Build a short lexicon for one teaching profile.",
        objectiveAr: "بناء معجم قصير لملف تعليمي واحد.",
        body: `A lexicon is a shared word list: peel, juicy, floral, cooked, creamy, sulfury, cardboard. Each word needs an anchor. “Fresh lemon” is useless if one taster means peel and another means lemonade sugar.`,
        bodyAr: `المعجم قائمة كلمات مشتركة: قشرة، عصيري، زهري، مطبوخ، كريمي، كبريتي، كرتوني. كل كلمة تحتاج مرجعاً.`,
        example: `Anchor: peel = cold lemon zest; cooked = lemon curd; cardboard = stale oil. Students smell the anchors before scoring.`,
        exampleAr: `المرجع: القشرة = بشر ليمون بارد؛ المطبوخ = كريم ليمون؛ الكرتون = زيت بائت.`,
        check: {
          question: "A lexicon is",
          options: [
            "A legal approval",
            "A shared, anchored sensory vocabulary",
            "A 100% formula",
            "A certificate",
          ],
          correct_index: 1,
        },
        summary: "Shared words with anchors beat adjectives.",
        summaryAr: "كلمات مشتركة بمراجع أفضل من صفات عامة.",
      },
    ],
    quiz: [
      ["Uncoded preference is weak because", ["People never disagree", "Expectation and brand bias distort the result", "It is legally required", "It replaces weighing"], 1],
      ["A good ballot includes", ["The flavorist name on the cup", "Codes, attributes, and space for defects", "A sales price", "A political slogan"], 1],
      ["Adaptation means", ["The law changed", "Repeated sniffing dulls perception", "The formula is approved", "PPE is optional"], 1],
    ],
  },
  {
    title: "Formulation Thinking and the 100% Formula",
    titleAr: "تفكير التركيب وصيغة 100٪",
    objective: "Write a complete, versioned 100% teaching formula.",
    objectiveAr: "كتابة صيغة تعليمية كاملة ومُصدَّرة بمجموع 100٪.",
    hasLab: true,
    lessons: [
      {
        title: "Anatomy of a 100% formula",
        titleAr: "تشريح صيغة 100٪",
        minutes: 10,
        objective: "List every required column on a teaching formula sheet.",
        objectiveAr: "عدّ أعمدة ورقة الصيغة التعليمية المطلوبة.",
        body: `A teaching formula is a controlled document: material name, teaching code, version, weight %, function, and notes. The column of weights must add to 100.00.

Missing solvent, forgotten dilution, or a 99.40 total are documentation defects, not rounding poetry.`,
        bodyAr: `الصيغة التعليمية وثيقة منضبطة: الاسم، الرمز التعليمي، الإصدار، النسبة، الوظيفة، والملاحظات. ويجب أن يكون مجموع الأوزان 100.00.`,
        example: `Header: Flavor TP-BEV-LEM-01 / Rev A / beverage teaching / not commercially approved. Footer: ${disclaimer}`,
        exampleAr: `الترويسة: النكهة TP-BEV-LEM-01 / المراجعة A / مشروب تعليمي / غير معتمدة تجارياً.`,
        check: {
          question: "A 100% formula must",
          options: [
            "Omit the solvent to look concentrated",
            "Sum to 100.00 with codes and versions",
            "Use only trade names",
            "Skip PPE notes",
          ],
          correct_index: 1,
        },
        summary: "Codes, versions, functions, 100.00 total, teaching banner on every sheet.",
        summaryAr: "رموز وإصدارات ووظائف ومجموع 100.00 وشعار تعليمي على كل ورقة.",
      },
      {
        title: "Worked citrus-vanilla teaching example",
        titleAr: "مثال محلول: حمضيات-فانيليا",
        minutes: 12,
        objective: "Read a complete teaching prototype and one revision.",
        objectiveAr: "قراءة نموذج تعليمي كامل ومراجعة واحدة.",
        body: `Teaching prototype TP-BEV-CV-01 Rev A (beverage, cold-fill classroom demo):

TP-LIM-001 citrus peel 42.00
TP-CIT-002 lemon character 10.00
TP-ALD-004 juicy modifier 1.50
TP-VAN-010 creamy blender 2.00
TP-PG-000 solvent 44.50
Total 100.00

Rev B reduces TP-CIT-002 to 8.00 and raises solvent to 46.50 after a coded panel called the first version “pithy.” Both revisions stay teaching prototypes.`,
        bodyAr: `النموذج التعليمي TP-BEV-CV-01 المراجعة A:

TP-LIM-001 قشرة حمضيات 42.00
TP-CIT-002 طابع ليمون 10.00
TP-ALD-004 معدّل عصيري 1.50
TP-VAN-010 مازج كريمي 2.00
TP-PG-000 مذيب 44.50
المجموع 100.00

المراجعة B تخفض TP-CIT-002 إلى 8.00 بعد تقييم مرمّز وصف النسخة الأولى بأنها «قشرة مرة».`,
        example: `${disclaimer}`,
        exampleAr: `${disclaimerAr}`,
        check: {
          question: "Rev B exists because",
          options: [
            "The formula became commercially approved",
            "A coded panel requested a documented change",
            "EU automatically cleared it",
            "The solvent was illegal",
          ],
          correct_index: 1,
        },
        summary: "Show the math, the codes, the revision reason, and the teaching banner.",
        summaryAr: "أظهر الحساب والرموز وسبب المراجعة والشعار التعليمي.",
      },
    ],
    lab: {
      title: "100% teaching formula worksheet",
      titleAr: "ورقة عمل صيغة 100٪",
      brief: `${disclaimer}\n\nWrite a 6–10 line 100% teaching formula for a cold beverage citrus profile. Include codes, versions, weights, functions, PPE, and one sentence on what you would verify with a supplier spec.`,
      briefAr: `${disclaimerAr}\n\nاكتب صيغة تعليمية 100٪ من 6–10 أسطر لنكهة حمضيات في مشروب بارد. أدرج الرموز والإصدارات والأوزان والوظائف ومعدات الوقاية وجملة عن فحص مواصفة المورّد.`,
    },
    quiz: [
      ["Weights on a teaching formula must", ["Be secret", "Total 100.00", "Ignore solvent", "Use ounces only"], 1],
      ["A revision is valid when", ["Someone liked it on social media", "The change and reason are written", "It is sold", "PPE is removed"], 1],
      ["The teaching banner means", ["Ready for retail", "Supervised training only", "FDA approval", "India listing complete"], 1],
    ],
  },
  {
    title: "Solvents, Carriers, and Physical Form",
    titleAr: "المذيبات والحاملات والشكل الفيزيائي",
    objective: "Choose a teaching carrier that matches the application story.",
    objectiveAr: "اختيار حامل تعليمي يناسب قصة التطبيق.",
    hasLab: true,
    lessons: [
      {
        title: "Solvents and carriers",
        titleAr: "المذيبات والحاملات",
        minutes: 9,
        objective: "Compare water-miscible and oil-leaning teaching carriers.",
        objectiveAr: "مقارنة الحاملات القابلة للامتزاج بالماء والمائلة للزيت.",
        body: `Propylene glycol, ethanol, triacetin, and vegetable oil are different teaching carriers. They change solubility, flash, viscosity, and how the flavor enters a beverage, a fat system, or a powder.

Students do not declare a carrier “food-grade” from this lesson. They record the intended carrier and the checks still required.`,
        bodyAr: `البروبيلين غليكول والإيثانول والتري أسيتين والزيت النباتي حاملات تعليمية مختلفة. تغيّر الذوبان واللزوجة وطريقة دخول النكهة.`,
        example: `Beverage classroom demo often starts with a water-miscible teaching solvent. A chocolate fat system may need an oil-leaning story instead.`,
        exampleAr: `عرض المشروب الصفّي يبدأ غالباً بمذيب قابل للامتزاج بالماء. أما نظام دهني فقد يحتاج قصة مائلة للزيت.`,
        check: {
          question: "Carrier choice depends on",
          options: [
            "The favorite color of the bottle",
            "The application and physical form",
            "Whether the formula is already approved",
            "Social media trends",
          ],
          correct_index: 1,
        },
        summary: "Match carrier to application; still verify status and specs.",
        summaryAr: "طابق الحامل مع التطبيق وما زلت تتحقق من الحالة والمواصفة.",
      },
      {
        title: "Liquid, emulsion, and powder thinking",
        titleAr: "التفكير بالسائل والمستحلب والمسحوق",
        minutes: 8,
        objective: "Explain why the same profile needs a new form.",
        objectiveAr: "شرح لماذا يحتاج نفس الملف شكلاً جديداً.",
        body: `A liquid teaching flavor, an emulsion, and a plated or spray-dried powder are different products. Heat, carriers, and surface area change what the consumer smells.

Do not convert a liquid 100% formula into a powder by wish. Write a new version.`,
        bodyAr: `النكهة السائلة والمستحلب والمسحوق منتجات مختلفة. لا تحوّل صيغة سائلة إلى مسحوق بالتمني. اكتب إصداراً جديداً.`,
        example: `Rev C of the citrus teaching flavor is a powder concept: carrier maltodextrin story + adsorbed liquid concentrate. New code family, new PPE for dust.`,
        exampleAr: `المراجعة C مفهوم مسحوق: حامل + ركازة ممتزة. عائلة رموز جديدة ومعدات وقاية للغبار.`,
        check: {
          question: "Changing physical form requires",
          options: [
            "The same document with no notes",
            "A new version and fresh checks",
            "Automatic commercial approval",
            "Deleting safety notes",
          ],
          correct_index: 1,
        },
        summary: "New form = new version, new process risks, same teaching banner.",
        summaryAr: "شكل جديد = إصدار جديد ومخاطر جديدة ونفس الشعار التعليمي.",
      },
    ],
    lab: {
      title: "Carrier selection worksheet",
      titleAr: "ورقة اختيار الحامل",
      brief: `${disclaimer}\n\nPick a teaching carrier for (1) a still flavored water and (2) a fat-based filling. Justify solubility, handling, and what you would verify on a real spec sheet.`,
      briefAr: `${disclaimerAr}\n\nاختر حاملاً تعليمياً لماء منكّه وللحشوة الدهنية. برّر الذوبان والتداول وما ستتحقق منه في مواصفة حقيقية.`,
    },
    quiz: [
      ["A solvent is chosen for", ["Decoration only", "Compatibility with the application", "Skipping regulations", "Hiding defects"], 1],
      ["Powder and liquid versions are", ["Always identical documents", "Different versions with different risks", "Automatically approved", "Illegal to teach"], 1],
      ["Dusting a powder flavor requires", ["No PPE", "Updated handling notes", "A sales launch", "Deleting codes"], 1],
    ],
  },
  {
    title: "Application Systems",
    titleAr: "أنظمة التطبيق",
    objective: "Build a small application matrix before claiming success.",
    objectiveAr: "بناء مصفوفة تطبيق صغيرة قبل ادعاء النجاح.",
    hasLab: true,
    lessons: [
      {
        title: "The base rewrites the flavor",
        titleAr: "القاعدة تعيد كتابة النكهة",
        minutes: 9,
        objective: "Predict how sugar, acid, fat, and protein move a profile.",
        objectiveAr: "توقع كيف تحرّك السكر والحمض والدهن والبروتين الملف.",
        body: `Sugar can lift fruit and hide bitterness. Acid can make citrus read juicier or harsher. Fat can mute top notes and hold lactones. Protein and minerals can bind aroma.

Therefore “it tasted fine in PG on a blotter” is not an application result.`,
        bodyAr: `قد يرفع السكر الفاكهة ويخفي المرارة. وقد يجعل الحمض الحمضيات أكثر عصيرية أو أقسى. الدهن يخمِد القمة ويمسك اللاكتونات.

لذلك فإن «طعمها جيد على الورق» ليست نتيجة تطبيق.`,
        example: `Same TP-BEV-CV-01 at 0.08% in acidified sugar water vs 0.08% in 3% fat milk. Students expect less peel and more creamy vanilla in milk.`,
        exampleAr: `نفس TP-BEV-CV-01 في ماء سكري حامض مقابل حليب 3٪ دهن. يُتوقع قشرة أقل وفانيليا أوضح في الحليب.`,
        check: {
          question: "An application test is required because",
          options: [
            "Blotter results equal beverages",
            "The food system changes perception",
            "It replaces regulatory checks",
            "It approves export",
          ],
          correct_index: 1,
        },
        summary: "Always re-taste in the intended base.",
        summaryAr: "أعد التذوق دائماً في القاعدة المقصودة.",
      },
      {
        title: "Application matrix thinking",
        titleAr: "تفكير مصفوفة التطبيق",
        minutes: 8,
        objective: "Record dose, process, and result in a grid.",
        objectiveAr: "تسجيل الجرعة والعملية والنتيجة في شبكة.",
        body: `A matrix is a table: application, dose, process (cold, pasteurized, baked), result, next action. It prevents “we tried something” from becoming folklore.`,
        bodyAr: `المصفوفة جدول: التطبيق، الجرعة، العملية، النتيجة، الإجراء التالي.`,
        example: `Water 0.06% cold = thin; water 0.10% cold = peel-heavy; yogurt 0.08% = acceptable citrus, weak vanilla. Next: Rev B vanilla +0.40 in concentrate.`,
        exampleAr: `ماء 0.06٪ بارد = ضعيف؛ 0.10٪ = قشرة عالية؛ زبادي 0.08٪ = حمضيات مقبولة وفانيليا ضعيفة.`,
        check: {
          question: "An application matrix should capture",
          options: [
            "Only the winning sample",
            "Dose, process, result, and next action",
            "Personal opinions without codes",
            "A commercial invoice",
          ],
          correct_index: 1,
        },
        summary: "Grid the trials. Keep codes on cups.",
        summaryAr: "جدول التجارب وأبقِ الرموز على الأكواب.",
      },
    ],
    lab: {
      title: "Mini application matrix",
      titleAr: "مصفوفة تطبيق مصغّرة",
      brief: `${disclaimer}\n\nBuild a 4-row matrix for one teaching flavor: two doses × two bases (water and a dairy or bakery story). Record coded notes and one next revision.`,
      briefAr: `${disclaimerAr}\n\nابنِ مصفوفة من 4 صفوف: جرعتان × قاعدتان. سجّل ملاحظات مرمّزة ومراجعة تالية.`,
    },
    quiz: [
      ["Fat in the base often", ["Increases all top notes equally", "Mutes some top notes and holds heavier notes", "Removes the need for a formula", "Approves the flavor"], 1],
      ["A matrix is useful because", ["It replaces safety", "It turns trials into a decision record", "It is optional decoration", "It is a certificate"], 1],
      ["Dose should be", ["Guessed after launch", "Written per application row", "The same in every food", "Hidden from the team"], 1],
    ],
  },
  {
    title: "Stability, Interaction, and Shelf Life",
    titleAr: "الثبات والتفاعل والعمر الافتراضي",
    objective: "Name the main classroom stability risks and how to record them.",
    objectiveAr: "تسمية مخاطر الثبات الصفّية وكيفية تسجيلها.",
    lessons: [
      {
        title: "Heat, pH, light, and packaging",
        titleAr: "الحرارة والحموضة والضوء والتعبئة",
        minutes: 9,
        objective: "Predict which notes fade or become dirty.",
        objectiveAr: "توقع أي النوتات تتلاشى أو تتسخ.",
        body: `Citrus top notes are famous for fading with heat and oxygen. Some aldehydes change character. Light and poor closures accelerate loss. Low pH can help some citrus stories and damage others.

Classroom tests are screening, not shelf-life validation.`,
        bodyAr: `نوتات الحمضيات العليا مشهورة بالتلاشي مع الحرارة والأكسجين. الاختبارات الصفّية فحص وليست إثبات عمر افتراضي.`,
        example: `Pasteurize the teaching beverage concept in a water bath if the instructor approves the setup. Compare coded cold vs heated samples the same day.`,
        exampleAr: `إذا وافق المشرف، قارن عينة باردة بعينة مسخّنة في اليوم نفسه بأكواد.`,
        check: {
          question: "A classroom heat check is",
          options: [
            "A legal shelf-life study",
            "A screening observation that must be labeled as such",
            "Proof of commercial stability",
            "Enough to skip packaging notes",
          ],
          correct_index: 1,
        },
        summary: "Screen, label the limits, do not claim validated shelf life.",
        summaryAr: "افحص، اذكر الحدود، ولا تدّعِ عمرًا افتراضيًا مثبتًا.",
      },
      {
        title: "Interactions and off-notes",
        titleAr: "التفاعلات والنوتات المعيبة",
        minutes: 7,
        objective: "Record cardboard, cooked, and sulfury defects without blame theater.",
        objectiveAr: "تسجيل عيوب الكرتون والمطبوخ والكبريت دون مسرح لوم.",
        body: `Off-notes are data. Cardboard can mean oxidation. Cooked can mean heat or a heavy peel oil. Sulfury can mean a useful trace that became too high.

Write the defect, the sample code, and the suspected mechanism. Then revise once.`,
        bodyAr: `العيوب بيانات. اكتب العيب ورمز العينة والآلية المتوقعة ثم راجع مرة واحدة.`,
        example: `248: cardboard 2/5 after 24 h open beaker — suspected oxidation. Action: close immediately, add note to storage instructions.`,
        exampleAr: `248: كرتون 2/5 بعد 24 ساعة في كأس مفتوح — شبهة أكسدة. الإجراء: أغلق فوراً.`,
        check: {
          question: "An off-note should be",
          options: [
            "Deleted from the notebook",
            "Coded, described, and linked to a next action",
            "Used to approve the product",
            "Posted publicly with the formula",
          ],
          correct_index: 1,
        },
        summary: "Defects drive one documented revision.",
        summaryAr: "العيوب تقود مراجعة موثّقة واحدة.",
      },
    ],
    quiz: [
      ["Classroom stability work is", ["Full validation", "Screening with stated limits", "A legal dossier", "Unnecessary"], 1],
      ["Citrus top notes often", ["Ignore oxygen", "Fade with heat and oxidation", "Become saltier", "Prove India compliance"], 1],
      ["The correct response to cardboard is", ["Hide the sample", "Record code, intensity, and a hypothesis", "Launch the SKU", "Add politics"], 1],
    ],
  },
  {
    title: "Safety, Regulatory, and Documentation Discipline",
    titleAr: "السلامة والتنظيم وانضباط التوثيق",
    objective: "Practice PPE, intended use, and multi-region verification reminders.",
    objectiveAr: "ممارسة معدات الوقاية والاستخدام المقصود وتذكيرات التحقق متعدد المناطق.",
    lessons: [
      {
        title: "PPE, hygiene, and intended use",
        titleAr: "معدات الوقاية والنظافة والاستخدام المقصود",
        minutes: 8,
        objective: "List minimum bench controls for a teaching lab.",
        objectiveAr: "عدّ الحد الأدنى لضوابط المختبر التعليمي.",
        body: `Minimum teaching controls: closed shoes, eye protection when required, gloves for concentrated materials, labeled vessels, no tasting from the concentrate bottle, no food in the weigh area, and instructor approval before any heat.

Intended use belongs on the sheet: “cold beverage classroom demo, not for unsupervised consumption, not for sale.”`,
        bodyAr: `الحد الأدنى: حذاء مغلق، حماية للعين عند الحاجة، قفازات للمركزات، أوعية موسومة، لا تذوق من زجاجة الركازة، وموافقة المشرف قبل أي تسخين.`,
        example: `Label: TP-BEV-CV-01 Rev B / Teaching Prototype / not for sale / instructor: _____ / date.`,
        exampleAr: `بطاقة: TP-BEV-CV-01 المراجعة B / نموذج تعليمي / ليس للبيع / المشرف: _____ / التاريخ.`,
        check: {
          question: "Concentrated teaching flavors should be",
          options: [
            "Tasted neat from the stock bottle",
            "Handled with labeled vessels and agreed PPE",
            "Taken home for parties",
            "Described as commercially approved",
          ],
          correct_index: 1,
        },
        summary: "PPE, labels, intended use, instructor control.",
        summaryAr: "وقاية، بطاقات، استخدام مقصود، وإشراف.",
      },
      {
        title: "EU, USA, and India verification reminders",
        titleAr: "تذكيرات التحقق في الاتحاد الأوروبي وأمريكا والهند",
        minutes: 10,
        objective: "Know what you must still verify outside this course.",
        objectiveAr: "معرفة ما يجب التحقق منه خارج هذه الدورة.",
        body: `This course does not grant regulatory clearance. Before any non-training use, a qualified person must verify:

• whether each material is permitted for the intended food category
• use-level limits and specification identity
• labeling, allergen, and religious claims if any
• EU flavoring rules and any national limits
• USA FDA / FEMA GRAS or other applicable status
• India FSSAI flavoring and additive expectations

Students record a checklist, they do not stamp “approved.”`,
        bodyAr: `هذه الدورة لا تمنح تصريحاً تنظيمياً. قبل أي استخدام خارج التدريب يجب أن يتحقق شخص مؤهل من السماح بالمادة، وحدود الاستخدام، والوسم، وقواعد الاتحاد الأوروبي، ووضع الولايات المتحدة، وتوقعات الهند.

يسجّل الطالب قائمة تحقق ولا يختم «معتمد».`,
        example: `Checklist row: TP-LIM-001 / identity to be confirmed on supplier CoA / EU status TBD / USA status TBD / India status TBD / not approved in this class.`,
        exampleAr: `صف القائمة: TP-LIM-001 / الهوية تُؤكد من شهادة المورّد / الوضع في الاتحاد الأوروبي وأمريكا والهند قيد التحقق / غير معتمد في هذا الصف.`,
        check: {
          question: "Completing this lesson means",
          options: [
            "The formula is cleared for EU, USA, and India",
            "You know which checks remain before any real use",
            "You may sell the teaching prototype",
            "Food-grade status is automatic",
          ],
          correct_index: 1,
        },
        summary: "Remind, checklist, never self-approve a commercial use.",
        summaryAr: "ذكّر، ضع قائمة، ولا تعتمد استخداماً تجارياً بنفسك.",
      },
    ],
    quiz: [
      ["This Academy clears commercial sale", ["True", "False — training only", "Only in India", "Only if sweet"], 1],
      ["EU, USA, and India checks are", ["Optional decoration", "Required before non-training use", "Replaced by a teaching code", "The same document"], 1],
      ["PPE is", ["Optional if the flavor smells nice", "Part of the laboratory method", "A marketing claim", "Proof of GRAS"], 1],
    ],
  },
  {
    title: "Laboratory Practice and Teaching Prototypes",
    titleAr: "ممارسة المختبر والنماذج التعليمية",
    objective: "Weigh, label, store, and revise like a supervised bench.",
    objectiveAr: "الوزن والوسم والتخزين والمراجعة كمنضدة تحت إشراف.",
    hasLab: true,
    lessons: [
      {
        title: "Teaching prototypes versus commercial products",
        titleAr: "النماذج التعليمية مقابل المنتجات التجارية",
        minutes: 8,
        objective: "State the difference without ambiguity.",
        objectiveAr: "ذكر الفرق بلا لبس.",
        body: `${disclaimer}

A commercial flavor has a released specification, approved materials, validated process, and a responsible company. A teaching prototype has a learning objective and a supervisor. Mixing the two languages is a professional failure.`,
        bodyAr: `${disclaimerAr}

النكهة التجارية لها مواصفة صادرة ومواد مقبولة وعملية مثبتة. النموذج التعليمي له هدف تعلّمي ومشرف. خلط اللغتين فشل مهني.`,
        example: `Wrong sentence: “This class lemon is approved for beverages in the USA.” Right sentence: “This class lemon is a teaching prototype; USA status was not established here.”`,
        exampleAr: `جملة خاطئة: «ليمون الصف معتمد للمشروبات في أمريكا». جملة صحيحة: «هذا نموذج تعليمي ولم يُثبت وضع أمريكا هنا».`,
        check: {
          question: "A teaching prototype is",
          options: [
            "A released commercial flavor",
            "A supervised training artifact with limits",
            "An export certificate",
            "A substitute for FSSAI approval",
          ],
          correct_index: 1,
        },
        summary: "Never describe a teaching formula as commercially approved.",
        summaryAr: "لا تصف صيغة تعليمية بأنها معتمدة تجارياً.",
      },
      {
        title: "Weighing, labeling, storage, and revision",
        titleAr: "الوزن والوسم والتخزين والمراجعة",
        minutes: 11,
        objective: "Execute one clean revision cycle.",
        objectiveAr: "تنفيذ دورة مراجعة نظيفة واحدة.",
        body: `Weigh largest to smallest when practical, close vessels, record actuals if they differ from targets, and label immediately.

Storage: tight closure, away from heat and light, teaching-only shelf, date, owner.

Revision: keep Rev A, create Rev B, write the reason from coded sensory, do not overwrite history.`,
        bodyAr: `زن من الأكبر إلى الأصغر عند الإمكان، أغلق الأوعية، سجّل الفعلي إن اختلف، وسمّ فوراً. احتفظ بالمراجعة A وأنشئ B مع السبب.`,
        example: `Storage line: 20–25 °C, dark, 30-day teaching hold, then supervised disposal. Not a commercial shelf-life claim.`,
        exampleAr: `التخزين: 20–25 م، ظلام، حفظ تعليمي 30 يوماً ثم إتلاف تحت إشراف. ليس ادعاء عمر تجاري.`,
        check: {
          question: "Overwriting Rev A is wrong because",
          options: [
            "History is part of professional control",
            "Computers forbid it",
            "It automatically approves Rev B",
            "PPE requires it",
          ],
          correct_index: 0,
        },
        summary: "Actuals, labels, storage limits, one written revision.",
        summaryAr: "أوزان فعلية، بطاقات، حدود تخزين، ومراجعة مكتوبة واحدة.",
      },
    ],
    lab: {
      title: "Supervised bench worksheet",
      titleAr: "ورقة المنضدة تحت الإشراف",
      brief: `${disclaimer}\n\nComplete a bench packet: PPE list, 100% formula, actual weights, labels, storage, coded tasting of Rev A, and Rev B with one reason. Attach photos only if your instructor allows.`,
      briefAr: `${disclaimerAr}\n\nأكمل حزمة المنضدة: وقاية، صيغة 100٪، أوزان فعلية، بطاقات، تخزين، تذوق مرمّز للمراجعة A، والمراجعة B بسبب واحد.`,
    },
    quiz: [
      ["Commercial language on a class formula is", ["Professional", "Misleading and not allowed in this Academy", "Required by FDA", "A certificate"], 1],
      ["Revision control means", ["Delete the old file", "Keep history and state the reason", "Change codes randomly", "Skip tasting"], 1],
      ["Storage notes should", ["Claim 18-month retail life", "State teaching hold conditions and limits", "Be empty", "List politics"], 1],
    ],
  },
  {
    title: "Capstone Studio",
    titleAr: "استوديو المشروع الختامي",
    objective: "Deliver one complete teaching dossier from brief to recommendation.",
    objectiveAr: "تسليم ملف تعليمي كامل من الموجز إلى التوصية.",
    hasLab: true,
    lessons: [
      {
        title: "From brief to recommendation",
        titleAr: "من الموجز إلى التوصية",
        minutes: 10,
        objective: "Assemble every required capstone section.",
        objectiveAr: "تجميع كل أقسام المشروع الختامي المطلوبة.",
        body: `The capstone is one teaching flavor dossier:

1. Sensory brief
2. 100% formula
3. Material codes and versions
4. Weights
5. Preparation method
6. PPE and safety
7. Storage instructions
8. Application matrix
9. Coded sensory evaluation
10. One documented formula revision
11. Regulatory and safety checklist
12. Final recommendation
13. Limitations

Every formula page must show: ${disclaimer}`,
        bodyAr: `المشروع الختامي ملف نكهة تعليمي واحد يضم الموجز، والصيغة 100٪، والرموز والإصدارات، والأوزان، والتحضير، والوقاية، والتخزين، ومصفوفة التطبيق، والتقييم المرمّز، ومراجعة واحدة، والقائمة التنظيمية، والتوصية، والحدود.

يجب أن يظهر على كل صفحة: ${disclaimerAr}`,
        example: `Recommendation language: “Rev B is the preferred teaching prototype for cold sugar-acid water in this class. It is not released, not sold, and not cleared for EU, USA, or India.”`,
        exampleAr: `لغة التوصية: «المراجعة B هي النموذج التعليمي المفضّل لماء سكري حامض في هذا الصف. ليست إصداراً تجارياً وليست م Cleared للاتحاد الأوروبي أو أمريكا أو الهند.»`,
        check: {
          question: "The capstone recommendation must include",
          options: [
            "A claim of commercial approval",
            "A preferred revision plus explicit limitations",
            "A political statement",
            "A hidden formula",
          ],
          correct_index: 1,
        },
        summary: "Complete dossier, teaching banner, honest limits.",
        summaryAr: "ملف كامل، شعار تعليمي، وحدود صادقة.",
      },
      {
        title: "One documented revision",
        titleAr: "مراجعة موثّقة واحدة",
        minutes: 8,
        objective: "Show that you can change a formula for a coded reason.",
        objectiveAr: "إظهار القدرة على تغيير الصيغة بسبب مرمّز.",
        body: `Pick one defect from your coded panel. Change one or two lines only. Recalculate to 100.00. Retaste. Write whether the defect moved.

If nothing improved, say so. A negative result is a valid teaching outcome.`,
        bodyAr: `اختر عيباً واحداً من اللجنة المرمّزة. غيّر سطراً أو سطرين. أعد الحساب إلى 100.00. أعد التذوق. النتيجة السلبية نتيجة تعليمية صحيحة.`,
        example: `Reason: coded pithy 3/5. Change: TP-CIT-002 10.00 → 8.00. Result: pithy 1/5, juicy slightly lower. Accept Rev B for class.`,
        exampleAr: `السبب: قشرة مرة 3/5. التغيير: 10.00 → 8.00. النتيجة: 1/5. قبول المراجعة B للصف.`,
        check: {
          question: "A good revision",
          options: [
            "Changes twenty materials at once with no reason",
            "Changes little, cites the coded defect, and reports the new result",
            "Deletes Rev A",
            "Claims global approval",
          ],
          correct_index: 1,
        },
        summary: "Small change, written reason, new total, new result.",
        summaryAr: "تغيير صغير، سبب مكتوب، مجموع جديد، نتيجة جديدة.",
      },
    ],
    lab: {
      title: "Capstone dossier upload",
      titleAr: "رفع ملف المشروع الختامي",
      brief: `${disclaimer}\n\nSubmit the thirteen-section dossier. Incomplete sections fail the capstone even if the flavor smells pleasant.`,
      briefAr: `${disclaimerAr}\n\nأرسل الملف ذا الأقسام الثلاثة عشر. نقص قسم يرسب المشروع حتى لو كانت الرائحة لطيفة.`,
    },
    quiz: [
      ["The capstone is complete only if", ["The aroma is strong", "All required sections are present", "A friend likes it", "It is sold"], 1],
      ["Limitations should mention", ["Nothing", "Training-only status and unverified regional requirements", "A launch date", "A celebrity"], 1],
      ["One revision means", ["Unlimited secret edits", "A documented Rev B with a coded reason", "Deleting evidence", "Skipping the matrix"], 1],
    ],
  },
];

function uuid(suffix) {
  return `11111111-1111-4111-8111-${suffix}`;
}

let lessonSeq = 2001;
let quizSeq = 3101;
let questionSeq = 4001;
let answerSeq = 5001;
let labSeq = 6101;
let resourceSeq = 7101;

const sql = [];
sql.push(`-- Flavor Experts Academy — first course (DRAFT)
-- Same IDs for English and Arabic. Do not publish from this file.

INSERT INTO public.courses (
  id, slug, title, title_ar, description, description_ar, level, duration_hours,
  estimated_minutes, status, is_published, premium, primary_language, has_capstone, version_number
) VALUES (
  '${COURSE}',
  'introduction-to-flavor-science-and-formulation',
  'Introduction to Flavor Science and Formulation',
  'مقدمة في علوم النكهات والتركيب',
  'A beginner Academy course on flavor perception, 100% teaching formulas, sensory discipline, application thinking, and supervised laboratory documentation. All formulas are teaching prototypes.',
  'دورة أكاديمية للمبتدئين في إدراك النكهة وصيغ 100٪ التعليمية وانضباط التقييم الحسي وتفكير التطبيق وتوثيق المختبر تحت إشراف. كل الصيغ نماذج تعليمية.',
  'beginner',
  8,
  180,
  'draft',
  false,
  false,
  'en',
  true,
  1
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_translations (course_id, language, title, subtitle, description, outcomes, audience)
VALUES
(
  '${COURSE}', 'en',
  'Introduction to Flavor Science and Formulation',
  'Beginner Academy path — teaching prototypes only',
  'Learn the professional loop from brief to coded sensory to one documented revision. English-first, fully localized in Arabic, same structure.',
  'Write a 100% teaching formula, run a coded tasting, complete a laboratory worksheet, and submit a capstone dossier with limitations.',
  'New practitioners, food-tech students, and industry joiners who need a safe first language for the flavor lab.'
),
(
  '${COURSE}', 'ar',
  'مقدمة في علوم النكهات والتركيب',
  'مسار أكاديمي للمبتدئين — نماذج تعليمية فقط',
  'تعلّم الحلقة المهنية من الموجز إلى التقييم المرمّز إلى مراجعة موثّقة واحدة. الإنجليزية أولاً مع تعريب كامل وبنفس البنية.',
  'كتابة صيغة تعليمية 100٪، وإجراء تذوق مرمّز، وإكمال ورقة مختبر، وتسليم مشروع ختامي مع ذكر الحدود.',
  'الممارسون الجدد وطلاب تقنية الغذاء والملتحقون بالصناعة.'
)
ON CONFLICT (course_id, language) DO NOTHING;
`);

modules.forEach((mod, index) => {
  const moduleId = uuid(String(111111111101 + index));
  const minutes = mod.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0) + 12;
  sql.push(`INSERT INTO public.course_modules (id, course_id, sort_order, status, estimated_minutes, has_lab)
VALUES ('${moduleId}', '${COURSE}', ${index + 1}, 'draft', ${minutes}, ${mod.hasLab ? "true" : "false"})
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.module_translations (module_id, language, title, objective, summary)
VALUES
('${moduleId}', 'en', ${q(mod.title)}, ${q(mod.objective)}, ${q(mod.title)}),
('${moduleId}', 'ar', ${q(mod.titleAr)}, ${q(mod.objectiveAr)}, ${q(mod.titleAr)})
ON CONFLICT (module_id, language) DO NOTHING;
`);

  mod.lessons.forEach((lesson, lessonIndex) => {
    const lessonId = uuid(String(111111112000 + lessonSeq++));
    sql.push(`INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('${lessonId}', '${moduleId}', ${lessonIndex + 1}, 'draft', ${lesson.minutes}, false, ${lessonIndex === mod.lessons.length - 1 ? "true" : "false"})
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('${lessonId}', 'en', ${q(lesson.title)}, ${q(lesson.objective)}, ${q(lesson.body)}, ${q(lesson.example)}, ${jsonb(lesson.check)}, ${q(lesson.summary)}),
('${lessonId}', 'ar', ${q(lesson.titleAr)}, ${q(lesson.objectiveAr)}, ${q(lesson.bodyAr)}, ${q(lesson.exampleAr)}, ${jsonb({
      question: lesson.check.question,
      options: lesson.check.options,
      correct_index: lesson.check.correct_index,
      explanation: lesson.check.explanation || "",
    })}, ${q(lesson.summaryAr)})
ON CONFLICT (lesson_id, language) DO NOTHING;
`);
  });

  const quizId = uuid(String(111111113000 + quizSeq++));
  sql.push(`INSERT INTO public.quizzes (id, course_id, module_id, kind, pass_percent, status, title, title_ar)
VALUES ('${quizId}', '${COURSE}', '${moduleId}', 'module', 70, 'draft', ${q(`${mod.title} check`)}, ${q(`اختبار ${mod.titleAr}`)})
ON CONFLICT (id) DO NOTHING;
`);
  mod.quiz.forEach((item, qi) => {
    const [prompt, options, correct] = item;
    const questionId = uuid(String(111111114000 + questionSeq++));
    sql.push(`INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('${questionId}', '${quizId}', ${qi + 1}, ${q(prompt)}, ${q(prompt)})
ON CONFLICT (id) DO NOTHING;
`);
    options.forEach((option, oi) => {
      const answerId = uuid(String(111111115000 + answerSeq++));
      sql.push(`INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('${answerId}', '${questionId}', ${oi + 1}, ${q(option)}, ${q(option)}, ${oi === correct ? "true" : "false"})
ON CONFLICT (id) DO NOTHING;
`);
    });
  });

  if (mod.lab) {
    const labId = uuid(String(111111116000 + labSeq++));
    sql.push(`INSERT INTO public.lab_assignments (id, course_id, module_id, title, title_ar, brief, brief_ar, status)
VALUES ('${labId}', '${COURSE}', '${moduleId}', ${q(mod.lab.title)}, ${q(mod.lab.titleAr)}, ${q(mod.lab.brief)}, ${q(mod.lab.briefAr)}, 'draft')
ON CONFLICT (id) DO NOTHING;
`);
  }
});

sql.push(`
INSERT INTO public.learning_path_courses (path_id, course_id, sort_order)
SELECT p.id, '${COURSE}', 1
FROM public.learning_paths p
WHERE p.slug = 'flavor-fundamentals'
ON CONFLICT (path_id, course_id) DO NOTHING;

INSERT INTO public.course_versions (course_id, version_number, status, notes, snapshot)
VALUES (
  '${COURSE}',
  1,
  'draft',
  'Initial bilingual draft of Introduction to Flavor Science and Formulation',
  '{"modules":10,"status":"draft"}'::jsonb
)
ON CONFLICT (course_id, version_number) DO NOTHING;
`);

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations", "20260831120100_academy_first_course_draft.sql");
writeFileSync(out, sql.join("\n"), "utf8");
console.log(`Wrote ${out}`);
