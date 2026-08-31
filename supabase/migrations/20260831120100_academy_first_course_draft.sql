-- Flavor Experts Academy — first course (DRAFT)
-- Same IDs for English and Arabic. Do not publish from this file.

INSERT INTO public.courses (
  id, slug, title, title_ar, description, description_ar, level, duration_hours,
  estimated_minutes, status, is_published, premium, primary_language, has_capstone, version_number
) VALUES (
  '11111111-1111-4111-8111-111111111111',
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
  '11111111-1111-4111-8111-111111111111', 'en',
  'Introduction to Flavor Science and Formulation',
  'Beginner Academy path — teaching prototypes only',
  'Learn the professional loop from brief to coded sensory to one documented revision. English-first, fully localized in Arabic, same structure.',
  'Write a 100% teaching formula, run a coded tasting, complete a laboratory worksheet, and submit a capstone dossier with limitations.',
  'New practitioners, food-tech students, and industry joiners who need a safe first language for the flavor lab.'
),
(
  '11111111-1111-4111-8111-111111111111', 'ar',
  'مقدمة في علوم النكهات والتركيب',
  'مسار أكاديمي للمبتدئين — نماذج تعليمية فقط',
  'تعلّم الحلقة المهنية من الموجز إلى التقييم المرمّز إلى مراجعة موثّقة واحدة. الإنجليزية أولاً مع تعريب كامل وبنفس البنية.',
  'كتابة صيغة تعليمية 100٪، وإجراء تذوق مرمّز، وإكمال ورقة مختبر، وتسليم مشروع ختامي مع ذكر الحدود.',
  'الممارسون الجدد وطلاب تقنية الغذاء والملتحقون بالصناعة.'
)
ON CONFLICT (course_id, language) DO NOTHING;

INSERT INTO public.course_modules (id, course_id, sort_order, status, estimated_minutes, has_lab)
VALUES ('11111111-1111-4111-8111-111111111101', '11111111-1111-4111-8111-111111111111', 1, 'draft', 29, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.module_translations (module_id, language, title, objective, summary)
VALUES
('11111111-1111-4111-8111-111111111101', 'en', 'The Language of Flavor', 'Define flavor as chemistry plus perception and map industry roles.', 'The Language of Flavor'),
('11111111-1111-4111-8111-111111111101', 'ar', 'لغة النكهة', 'تعريف النكهة بوصفها كيمياء وإدراكاً، وفهم أدوار الصناعة.', 'لغة النكهة')
ON CONFLICT (module_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114001', '11111111-1111-4111-8111-111111111101', 1, 'draft', 9, false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114001', 'en', 'What flavor actually is', 'Separate taste, aroma, trigeminal effect, and context.', 'Flavor is not a single molecule and not a marketing adjective. In professional practice it is the combined experience of taste, aroma, chemesthesis, and the food system that carries them.

Taste covers sweet, sour, salty, bitter, and umami. Aroma is the larger vocabulary: esters, aldehydes, sulfur notes, pyrazines, lactones, and many more. The trigeminal system adds burn, cooling, tingling, and astringency.

A strawberry flavor for yogurt is therefore a different technical problem from a strawberry flavor for a hard candy. The same named profile must be rebuilt for water activity, fat, pH, process heat, and legal status.', 'A client asks for “fresh lemon.” A junior mistake is to add only citral. A better first model is: a citrus peel top (limonene teaching code TP-LIM-001), a juicy aldehyde accent, a small sour taste support in the application, and a check against heat if the drink will be pasteurized.', '{"question":"Which statement is professionally accurate?","options":["Flavor is only the sweet taste of a product","Flavor is aroma + taste + chemesthesis inside a specific food system","Any lemon aroma chemical is commercially approved for every country","A teaching formula can be sold as a finished flavor"],"correct_index":1,"explanation":"Flavor is a system-level perception problem, not a single raw material."}', 'Flavor = taste + aroma + trigeminal effect + application. Named profiles must be rebuilt for each base.'),
('11111111-1111-4111-8111-111111114001', 'ar', 'ما هي النكهة فعلاً', 'التمييز بين الطعم والرائحة والإحساس الثلاثي التوائم والسياق.', 'النكهة ليست جزيئاً واحداً وليست صفة تسويقية. في الممارسة المهنية هي تجربة مركّبة من الطعم والرائحة والإحساس الكيميائي ونظام الغذاء الذي يحملها.

يشمل الطعم الحلاوة والحموضة والملوحة والمرارة والأومامي. أما الرائحة فهي المفردات الأوسع. ويضيف الجهاز الثلاثي التوائم الحرارة والبرودة والنخز والقباضة.

لذلك فإن نكهة فراولة للزبادي مشكلة تقنية مختلفة عن نكهة فراولة للحلويات الصلبة. يجب إعادة بناء نفس الاسم حسب النشاط المائي والدهن ودرجة الحموضة والحرارة والحالة التنظيمية.', 'يطلب العميل «ليموناً طازجاً». الخطأ الشائع هو إضافة السترال فقط. النموذج الأفضل يبدأ بقشرة حمضيات، ولمسة ألدهيدية، ودعم حامض في التطبيق، ثم فحص الحرارة إذا كان المشروب سيبستر.', '{"question":"Which statement is professionally accurate?","options":["Flavor is only the sweet taste of a product","Flavor is aroma + taste + chemesthesis inside a specific food system","Any lemon aroma chemical is commercially approved for every country","A teaching formula can be sold as a finished flavor"],"correct_index":1,"explanation":"Flavor is a system-level perception problem, not a single raw material."}', 'النكهة = طعم + رائحة + إحساس ثلاثي + تطبيق. يجب إعادة بناء الملف لكل قاعدة.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114002', '11111111-1111-4111-8111-111111111101', 2, 'draft', 8, false, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114002', 'en', 'How flavor teams work', 'Identify the brief, lab, sensory, regulatory, and application loop.', 'A professional flavor project usually moves through a brief, a hypothesis, a first weighing, a coded sensory check, a documented revision, and a recommendation with limitations.

The brief should state the application, process, target consumers, forbidden notes, cost band, and any religious or regional constraints. The laboratory converts that into a 100% formula with material codes and versions.

This Academy treats every bench formula as a teaching prototype. It is for supervised R&D training and evaluation only.', 'Roles: flavorist (composition), application specialist (the food), sensory lead (coded evaluation), regulatory (status and use level), and project owner (decision). Students practice all five in miniature.', '{"question":"What must a useful flavor brief include?","options":["Only a favorite brand name","Application, process, constraints, and success criteria","A commercially approved finished SKU","A political or entertainment story"],"correct_index":1}', 'Brief → hypothesis → weigh → coded sensory → revision → recommendation with limits.'),
('11111111-1111-4111-8111-111111114002', 'ar', 'كيف تعمل فرق النكهات', 'فهم حلقة الموجز والمختبر والحسي والتنظيمي والتطبيق.', 'يمر مشروع النكهة المهني عادة بالموجز، ثم الفرضية، ثم الوزن الأول، ثم تقييم حسي مرمّز، ثم مراجعة موثّقة، ثم توصية مع ذكر الحدود.

يجب أن يذكر الموجز التطبيق والعملية والمستهلك المستهدف والنوتات الممنوعة ونطاق التكلفة وأي قيود إقليمية. ويحوّل المختبر ذلك إلى صيغة 100٪ برموز مواد وإصدارات.

تعامل هذه الأكاديمية كل صيغة مختبرية كنموذج تعليمي تحت إشراف فقط.', 'الأدوار: مركّب النكهة، أخصائي التطبيق، قائد التقييم الحسي، المسؤول التنظيمي، وصاحب القرار. يتدرّب الطالب على الخمسة بشكل مصغّر.', '{"question":"What must a useful flavor brief include?","options":["Only a favorite brand name","Application, process, constraints, and success criteria","A commercially approved finished SKU","A political or entertainment story"],"correct_index":1,"explanation":""}', 'موجز → فرضية → وزن → تقييم مرمّز → مراجعة → توصية مع حدود.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.quizzes (id, course_id, module_id, kind, pass_percent, status, title, title_ar)
VALUES ('11111111-1111-4111-8111-111111116101', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111101', 'module', 70, 'draft', 'The Language of Flavor check', 'اختبار لغة النكهة')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118001', '11111111-1111-4111-8111-111111116101', 1, 'Flavor is best described as', 'Flavor is best described as')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120001', '11111111-1111-4111-8111-111111118001', 1, 'Only sweetness', 'Only sweetness', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120002', '11111111-1111-4111-8111-111111118001', 2, 'A system of taste, aroma, and context', 'A system of taste, aroma, and context', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120003', '11111111-1111-4111-8111-111111118001', 3, 'A trademark', 'A trademark', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120004', '11111111-1111-4111-8111-111111118001', 4, 'A finished commercial SKU', 'A finished commercial SKU', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118002', '11111111-1111-4111-8111-111111116101', 2, 'A teaching prototype may be', 'A teaching prototype may be')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120005', '11111111-1111-4111-8111-111111118002', 1, 'Sold as approved', 'Sold as approved', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120006', '11111111-1111-4111-8111-111111118002', 2, 'Used without checking food-grade status', 'Used without checking food-grade status', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120007', '11111111-1111-4111-8111-111111118002', 3, 'Used for supervised training only', 'Used for supervised training only', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120008', '11111111-1111-4111-8111-111111118002', 4, 'Copied onto a customer COA', 'Copied onto a customer COA', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118003', '11111111-1111-4111-8111-111111116101', 3, 'The application base matters because', 'The application base matters because')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120009', '11111111-1111-4111-8111-111111118003', 1, 'It never changes perception', 'It never changes perception', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120010', '11111111-1111-4111-8111-111111118003', 2, 'Heat, fat, and pH reshape the same formula', 'Heat, fat, and pH reshape the same formula', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120011', '11111111-1111-4111-8111-111111118003', 3, 'All drinks behave like candy', 'All drinks behave like candy', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120012', '11111111-1111-4111-8111-111111118003', 4, 'Regulations are identical worldwide', 'Regulations are identical worldwide', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_modules (id, course_id, sort_order, status, estimated_minutes, has_lab)
VALUES ('11111111-1111-4111-8111-111111111102', '11111111-1111-4111-8111-111111111111', 2, 'draft', 31, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.module_translations (module_id, language, title, objective, summary)
VALUES
('11111111-1111-4111-8111-111111111102', 'en', 'Raw Materials and Building Blocks', 'Classify naturals, extracts, isolates, and aroma chemicals as teaching materials.', 'Raw Materials and Building Blocks'),
('11111111-1111-4111-8111-111111111102', 'ar', 'المواد الخام ولبنات البناء', 'تصنيف الطبيعيات والمستخلصات والمعزولات وكيماويات الرائحة كمواد تعليمية.', 'المواد الخام ولبنات البناء')
ON CONFLICT (module_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114003', '11111111-1111-4111-8111-111111111102', 1, 'draft', 10, false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114003', 'en', 'Naturals, extracts, and isolates', 'Read a material class without treating the name as a formula.', 'Orange oil, vanilla extract, and menthol isolate are not interchangeable “naturals.” They differ in composition, solvent, residual volatiles, color, and regulatory listing.

In this course every material receives a teaching code such as TP-ORJ-001. The code is not a supplier SKU and does not prove food-grade status. Students must still check the real specification in a supervised lab.', 'TP-VAN-010 might represent a folded vanilla extract used at 2.00% in a teaching cream flavor. The 2.00% is a classroom starting point, not a commercial use level.', '{"question":"A teaching material code means","options":["The item is commercially approved worldwide","A classroom identity that still needs specification checks","The formula can be manufactured at scale","EU, USA, and India already accept the use"],"correct_index":1}', 'Class the material, code it, and never skip specification and status checks.'),
('11111111-1111-4111-8111-111111114003', 'ar', 'الطبيعيات والمستخلصات والمعزولات', 'قراءة فئة المادة دون اعتبار الاسم صيغة.', 'زيت البرتقال ومستخلص الفانيليا والمنثول المعزول ليست «طبيعيات» قابلة للتبديل. تختلف في التركيب والمذيب والمتبقيات واللون والقائمة التنظيمية.

في هذه الدورة تأخذ كل مادة رمزاً تعليمياً مثل TP-ORJ-001. الرمز ليس رقم مورّد ولا يثبت الدرجة الغذائية.', 'قد يمثّل TP-VAN-010 مستخلص فانيليا مطوياً بنسبة 2.00٪ في نكهة كريمة تعليمية. هذه نقطة بداية صفّية وليست مستوى استخدام تجاري.', '{"question":"A teaching material code means","options":["The item is commercially approved worldwide","A classroom identity that still needs specification checks","The formula can be manufactured at scale","EU, USA, and India already accept the use"],"correct_index":1,"explanation":""}', 'صنّف المادة، رمزها، ولا تتخطَّ فحص المواصفة والحالة التنظيمية.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114004', '11111111-1111-4111-8111-111111111102', 2, 'draft', 9, false, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114004', 'en', 'Aroma chemicals and balance', 'Use character, modifier, and blender roles in a teaching stack.', 'A practical stack has character items (the recognizable note), modifiers (fresh, ripe, cooked, creamy), and blenders/solvents that make the mix weighable and stable enough for class.

High-impact sulfur or pyrazine items are used at very low teaching percentages. If a material is too strong to weigh on the available balance, it is pre-diluted and the dilution version is written on the formula.', 'Citrus teaching stack: TP-LIM-001 40.00, TP-CIT-002 8.00, TP-ALD-004 1.20, TP-VAN-010 0.80, solvent to 100.00. Still a teaching prototype.', '{"question":"Why pre-dilute a high-impact material?","options":["To hide it from regulatory review","To make a weighable, versioned teaching addition","To claim commercial approval","To skip PPE"],"correct_index":1}', 'Character + modifier + blender. Version dilutions. Keep the 100% total honest.'),
('11111111-1111-4111-8111-111111114004', 'ar', 'كيماويات الرائحة والتوازن', 'استخدام أدوار الطابع والمعدّل والمازج في مجموعة تعليمية.', 'المجموعة العملية تشمل مواد الطابع، والمعدّلات، والمازجات/المذيبات التي تجعل الخلطة قابلة للوزن ومستقرة بما يكفي للصف.

تستخدم مواد الكبريت أو البيرازين عالية الأثر بنسب تعليمية منخفضة جداً. إذا تعذّر الوزن تُمدَّد مسبقاً ويُكتب إصدار التخفيف على الصيغة.', 'مجموعة حمضيات تعليمية: TP-LIM-001 ‏40.00، TP-CIT-002 ‏8.00، TP-ALD-004 ‏1.20، TP-VAN-010 ‏0.80، والمذيب حتى 100.00. ما تزال نموذجاً تعليمياً.', '{"question":"Why pre-dilute a high-impact material?","options":["To hide it from regulatory review","To make a weighable, versioned teaching addition","To claim commercial approval","To skip PPE"],"correct_index":1,"explanation":""}', 'طابع + معدّل + مازج. وثّق التخفيفات. اجعل مجموع 100٪ صادقاً.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.quizzes (id, course_id, module_id, kind, pass_percent, status, title, title_ar)
VALUES ('11111111-1111-4111-8111-111111116102', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111102', 'module', 70, 'draft', 'Raw Materials and Building Blocks check', 'اختبار المواد الخام ولبنات البناء')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118004', '11111111-1111-4111-8111-111111116102', 1, 'Teaching codes are', 'Teaching codes are')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120013', '11111111-1111-4111-8111-111111118004', 1, 'Supplier SKUs', 'Supplier SKUs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120014', '11111111-1111-4111-8111-111111118004', 2, 'Classroom identities pending real specs', 'Classroom identities pending real specs', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120015', '11111111-1111-4111-8111-111111118004', 3, 'Proof of food-grade status', 'Proof of food-grade status', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120016', '11111111-1111-4111-8111-111111118004', 4, 'Export certificates', 'Export certificates', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118005', '11111111-1111-4111-8111-111111116102', 2, 'A blender or solvent is used to', 'A blender or solvent is used to')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120017', '11111111-1111-4111-8111-111111118005', 1, 'Replace sensory evaluation', 'Replace sensory evaluation', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120018', '11111111-1111-4111-8111-111111118005', 2, 'Make the formula weighable and complete 100%', 'Make the formula weighable and complete 100%', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120019', '11111111-1111-4111-8111-111111118005', 3, 'Approve the product', 'Approve the product', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120020', '11111111-1111-4111-8111-111111118005', 4, 'Avoid documentation', 'Avoid documentation', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118006', '11111111-1111-4111-8111-111111116102', 3, 'High-impact materials should be', 'High-impact materials should be')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120021', '11111111-1111-4111-8111-111111118006', 1, 'Dumped at 20%', 'Dumped at 20%', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120022', '11111111-1111-4111-8111-111111118006', 2, 'Pre-diluted and versioned when needed', 'Pre-diluted and versioned when needed', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120023', '11111111-1111-4111-8111-111111118006', 3, 'Ignored', 'Ignored', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120024', '11111111-1111-4111-8111-111111118006', 4, 'Called commercially approved', 'Called commercially approved', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_modules (id, course_id, sort_order, status, estimated_minutes, has_lab)
VALUES ('11111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111111', 3, 'draft', 27, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.module_translations (module_id, language, title, objective, summary)
VALUES
('11111111-1111-4111-8111-111111111103', 'en', 'Sensory Science Foundations', 'Run a coded, bias-aware tasting appropriate for training.', 'Sensory Science Foundations'),
('11111111-1111-4111-8111-111111111103', 'ar', 'أسس علم التقييم الحسي', 'إجراء تذوق مرمّز يراعي التحيّز ومناسب للتدريب.', 'أسس علم التقييم الحسي')
ON CONFLICT (module_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114005', '11111111-1111-4111-8111-111111111103', 1, 'draft', 8, false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114005', 'en', 'Thresholds, adaptation, and bias', 'Explain why uncoded “I like it” is not a result.', 'Sensory work fails when the taster sees the brand, the formula number they prefer, or the colleague who made the sample. Training uses coded cups, a defined lexicon, palate cleansers, and a written ballot.

Adaptation dulls a note after repeated sniffing. Thresholds differ by person. Therefore one enthusiastic opinion is not a release decision.', 'Ballot line: sample 247 vs 248, score citrus peel 0–5, score cooked 0–5, write one defect, do not discuss until all scores are in.', '{"question":"Coded evaluation is used to","options":["Hide unsafe samples","Reduce expectation bias","Skip documentation","Approve a commercial launch"],"correct_index":1}', 'Code samples, define attributes, write scores, then discuss.'),
('11111111-1111-4111-8111-111111114005', 'ar', 'العتبات والتكيّف والتحيّز', 'شرح لماذا عبارة «أعجبني» غير المرمّزة ليست نتيجة.', 'يفشل العمل الحسي عندما يرى المتذوق العلامة أو رقم الصيغة المفضّل أو اسم الزميل. يستخدم التدريب أكواباً مرمّزة ومعجماً محدداً ومنظفات للحلق واستمارة مكتوبة.', 'سطر الاستمارة: العينة 247 مقابل 248، قشّرة حمضيات 0–5، مطبوخ 0–5، عيب واحد، بلا نقاش قبل جمع الدرجات.', '{"question":"Coded evaluation is used to","options":["Hide unsafe samples","Reduce expectation bias","Skip documentation","Approve a commercial launch"],"correct_index":1,"explanation":""}', 'رمّز العينات، حدّد الصفات، اكتب الدرجات، ثم ناقش.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114006', '11111111-1111-4111-8111-111111111103', 2, 'draft', 7, false, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114006', 'en', 'Lexicons and coded comparison', 'Build a short lexicon for one teaching profile.', 'A lexicon is a shared word list: peel, juicy, floral, cooked, creamy, sulfury, cardboard. Each word needs an anchor. “Fresh lemon” is useless if one taster means peel and another means lemonade sugar.', 'Anchor: peel = cold lemon zest; cooked = lemon curd; cardboard = stale oil. Students smell the anchors before scoring.', '{"question":"A lexicon is","options":["A legal approval","A shared, anchored sensory vocabulary","A 100% formula","A certificate"],"correct_index":1}', 'Shared words with anchors beat adjectives.'),
('11111111-1111-4111-8111-111111114006', 'ar', 'المعاجم والمقارنة المرمّزة', 'بناء معجم قصير لملف تعليمي واحد.', 'المعجم قائمة كلمات مشتركة: قشرة، عصيري، زهري، مطبوخ، كريمي، كبريتي، كرتوني. كل كلمة تحتاج مرجعاً.', 'المرجع: القشرة = بشر ليمون بارد؛ المطبوخ = كريم ليمون؛ الكرتون = زيت بائت.', '{"question":"A lexicon is","options":["A legal approval","A shared, anchored sensory vocabulary","A 100% formula","A certificate"],"correct_index":1,"explanation":""}', 'كلمات مشتركة بمراجع أفضل من صفات عامة.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.quizzes (id, course_id, module_id, kind, pass_percent, status, title, title_ar)
VALUES ('11111111-1111-4111-8111-111111116103', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111103', 'module', 70, 'draft', 'Sensory Science Foundations check', 'اختبار أسس علم التقييم الحسي')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118007', '11111111-1111-4111-8111-111111116103', 1, 'Uncoded preference is weak because', 'Uncoded preference is weak because')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120025', '11111111-1111-4111-8111-111111118007', 1, 'People never disagree', 'People never disagree', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120026', '11111111-1111-4111-8111-111111118007', 2, 'Expectation and brand bias distort the result', 'Expectation and brand bias distort the result', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120027', '11111111-1111-4111-8111-111111118007', 3, 'It is legally required', 'It is legally required', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120028', '11111111-1111-4111-8111-111111118007', 4, 'It replaces weighing', 'It replaces weighing', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118008', '11111111-1111-4111-8111-111111116103', 2, 'A good ballot includes', 'A good ballot includes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120029', '11111111-1111-4111-8111-111111118008', 1, 'The flavorist name on the cup', 'The flavorist name on the cup', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120030', '11111111-1111-4111-8111-111111118008', 2, 'Codes, attributes, and space for defects', 'Codes, attributes, and space for defects', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120031', '11111111-1111-4111-8111-111111118008', 3, 'A sales price', 'A sales price', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120032', '11111111-1111-4111-8111-111111118008', 4, 'A political slogan', 'A political slogan', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118009', '11111111-1111-4111-8111-111111116103', 3, 'Adaptation means', 'Adaptation means')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120033', '11111111-1111-4111-8111-111111118009', 1, 'The law changed', 'The law changed', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120034', '11111111-1111-4111-8111-111111118009', 2, 'Repeated sniffing dulls perception', 'Repeated sniffing dulls perception', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120035', '11111111-1111-4111-8111-111111118009', 3, 'The formula is approved', 'The formula is approved', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120036', '11111111-1111-4111-8111-111111118009', 4, 'PPE is optional', 'PPE is optional', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_modules (id, course_id, sort_order, status, estimated_minutes, has_lab)
VALUES ('11111111-1111-4111-8111-111111111104', '11111111-1111-4111-8111-111111111111', 4, 'draft', 34, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.module_translations (module_id, language, title, objective, summary)
VALUES
('11111111-1111-4111-8111-111111111104', 'en', 'Formulation Thinking and the 100% Formula', 'Write a complete, versioned 100% teaching formula.', 'Formulation Thinking and the 100% Formula'),
('11111111-1111-4111-8111-111111111104', 'ar', 'تفكير التركيب وصيغة 100٪', 'كتابة صيغة تعليمية كاملة ومُصدَّرة بمجموع 100٪.', 'تفكير التركيب وصيغة 100٪')
ON CONFLICT (module_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114007', '11111111-1111-4111-8111-111111111104', 1, 'draft', 10, false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114007', 'en', 'Anatomy of a 100% formula', 'List every required column on a teaching formula sheet.', 'A teaching formula is a controlled document: material name, teaching code, version, weight %, function, and notes. The column of weights must add to 100.00.

Missing solvent, forgotten dilution, or a 99.40 total are documentation defects, not rounding poetry.', 'Header: Flavor TP-BEV-LEM-01 / Rev A / beverage teaching / not commercially approved. Footer: Teaching Prototype — For supervised R&D training and evaluation only. Verify food-grade status, supplier specifications, intended application, and applicable EU, USA, and India requirements. This formula is not commercially approved.', '{"question":"A 100% formula must","options":["Omit the solvent to look concentrated","Sum to 100.00 with codes and versions","Use only trade names","Skip PPE notes"],"correct_index":1}', 'Codes, versions, functions, 100.00 total, teaching banner on every sheet.'),
('11111111-1111-4111-8111-111111114007', 'ar', 'تشريح صيغة 100٪', 'عدّ أعمدة ورقة الصيغة التعليمية المطلوبة.', 'الصيغة التعليمية وثيقة منضبطة: الاسم، الرمز التعليمي، الإصدار، النسبة، الوظيفة، والملاحظات. ويجب أن يكون مجموع الأوزان 100.00.', 'الترويسة: النكهة TP-BEV-LEM-01 / المراجعة A / مشروب تعليمي / غير معتمدة تجارياً.', '{"question":"A 100% formula must","options":["Omit the solvent to look concentrated","Sum to 100.00 with codes and versions","Use only trade names","Skip PPE notes"],"correct_index":1,"explanation":""}', 'رموز وإصدارات ووظائف ومجموع 100.00 وشعار تعليمي على كل ورقة.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114008', '11111111-1111-4111-8111-111111111104', 2, 'draft', 12, false, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114008', 'en', 'Worked citrus-vanilla teaching example', 'Read a complete teaching prototype and one revision.', 'Teaching prototype TP-BEV-CV-01 Rev A (beverage, cold-fill classroom demo):

TP-LIM-001 citrus peel 42.00
TP-CIT-002 lemon character 10.00
TP-ALD-004 juicy modifier 1.50
TP-VAN-010 creamy blender 2.00
TP-PG-000 solvent 44.50
Total 100.00

Rev B reduces TP-CIT-002 to 8.00 and raises solvent to 46.50 after a coded panel called the first version “pithy.” Both revisions stay teaching prototypes.', 'Teaching Prototype — For supervised R&D training and evaluation only. Verify food-grade status, supplier specifications, intended application, and applicable EU, USA, and India requirements. This formula is not commercially approved.', '{"question":"Rev B exists because","options":["The formula became commercially approved","A coded panel requested a documented change","EU automatically cleared it","The solvent was illegal"],"correct_index":1}', 'Show the math, the codes, the revision reason, and the teaching banner.'),
('11111111-1111-4111-8111-111111114008', 'ar', 'مثال محلول: حمضيات-فانيليا', 'قراءة نموذج تعليمي كامل ومراجعة واحدة.', 'النموذج التعليمي TP-BEV-CV-01 المراجعة A:

TP-LIM-001 قشرة حمضيات 42.00
TP-CIT-002 طابع ليمون 10.00
TP-ALD-004 معدّل عصيري 1.50
TP-VAN-010 مازج كريمي 2.00
TP-PG-000 مذيب 44.50
المجموع 100.00

المراجعة B تخفض TP-CIT-002 إلى 8.00 بعد تقييم مرمّز وصف النسخة الأولى بأنها «قشرة مرة».', 'نموذج تعليمي — للتدريب والتقييم في البحث والتطوير تحت إشراف فقط. تحقق من صلاحية الدرجة الغذائية ومواصفات المورّد والاستخدام المقصود ومتطلبات الاتحاد الأوروبي والولايات المتحدة والهند. هذه الصيغة ليست معتمدة تجارياً.', '{"question":"Rev B exists because","options":["The formula became commercially approved","A coded panel requested a documented change","EU automatically cleared it","The solvent was illegal"],"correct_index":1,"explanation":""}', 'أظهر الحساب والرموز وسبب المراجعة والشعار التعليمي.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.quizzes (id, course_id, module_id, kind, pass_percent, status, title, title_ar)
VALUES ('11111111-1111-4111-8111-111111116104', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111104', 'module', 70, 'draft', 'Formulation Thinking and the 100% Formula check', 'اختبار تفكير التركيب وصيغة 100٪')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118010', '11111111-1111-4111-8111-111111116104', 1, 'Weights on a teaching formula must', 'Weights on a teaching formula must')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120037', '11111111-1111-4111-8111-111111118010', 1, 'Be secret', 'Be secret', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120038', '11111111-1111-4111-8111-111111118010', 2, 'Total 100.00', 'Total 100.00', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120039', '11111111-1111-4111-8111-111111118010', 3, 'Ignore solvent', 'Ignore solvent', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120040', '11111111-1111-4111-8111-111111118010', 4, 'Use ounces only', 'Use ounces only', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118011', '11111111-1111-4111-8111-111111116104', 2, 'A revision is valid when', 'A revision is valid when')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120041', '11111111-1111-4111-8111-111111118011', 1, 'Someone liked it on social media', 'Someone liked it on social media', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120042', '11111111-1111-4111-8111-111111118011', 2, 'The change and reason are written', 'The change and reason are written', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120043', '11111111-1111-4111-8111-111111118011', 3, 'It is sold', 'It is sold', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120044', '11111111-1111-4111-8111-111111118011', 4, 'PPE is removed', 'PPE is removed', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118012', '11111111-1111-4111-8111-111111116104', 3, 'The teaching banner means', 'The teaching banner means')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120045', '11111111-1111-4111-8111-111111118012', 1, 'Ready for retail', 'Ready for retail', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120046', '11111111-1111-4111-8111-111111118012', 2, 'Supervised training only', 'Supervised training only', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120047', '11111111-1111-4111-8111-111111118012', 3, 'FDA approval', 'FDA approval', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120048', '11111111-1111-4111-8111-111111118012', 4, 'India listing complete', 'India listing complete', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lab_assignments (id, course_id, module_id, title, title_ar, brief, brief_ar, status)
VALUES ('11111111-1111-4111-8111-111111122101', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111104', '100% teaching formula worksheet', 'ورقة عمل صيغة 100٪', 'Teaching Prototype — For supervised R&D training and evaluation only. Verify food-grade status, supplier specifications, intended application, and applicable EU, USA, and India requirements. This formula is not commercially approved.

Write a 6–10 line 100% teaching formula for a cold beverage citrus profile. Include codes, versions, weights, functions, PPE, and one sentence on what you would verify with a supplier spec.', 'نموذج تعليمي — للتدريب والتقييم في البحث والتطوير تحت إشراف فقط. تحقق من صلاحية الدرجة الغذائية ومواصفات المورّد والاستخدام المقصود ومتطلبات الاتحاد الأوروبي والولايات المتحدة والهند. هذه الصيغة ليست معتمدة تجارياً.

اكتب صيغة تعليمية 100٪ من 6–10 أسطر لنكهة حمضيات في مشروب بارد. أدرج الرموز والإصدارات والأوزان والوظائف ومعدات الوقاية وجملة عن فحص مواصفة المورّد.', 'draft')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_modules (id, course_id, sort_order, status, estimated_minutes, has_lab)
VALUES ('11111111-1111-4111-8111-111111111105', '11111111-1111-4111-8111-111111111111', 5, 'draft', 29, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.module_translations (module_id, language, title, objective, summary)
VALUES
('11111111-1111-4111-8111-111111111105', 'en', 'Solvents, Carriers, and Physical Form', 'Choose a teaching carrier that matches the application story.', 'Solvents, Carriers, and Physical Form'),
('11111111-1111-4111-8111-111111111105', 'ar', 'المذيبات والحاملات والشكل الفيزيائي', 'اختيار حامل تعليمي يناسب قصة التطبيق.', 'المذيبات والحاملات والشكل الفيزيائي')
ON CONFLICT (module_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114009', '11111111-1111-4111-8111-111111111105', 1, 'draft', 9, false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114009', 'en', 'Solvents and carriers', 'Compare water-miscible and oil-leaning teaching carriers.', 'Propylene glycol, ethanol, triacetin, and vegetable oil are different teaching carriers. They change solubility, flash, viscosity, and how the flavor enters a beverage, a fat system, or a powder.

Students do not declare a carrier “food-grade” from this lesson. They record the intended carrier and the checks still required.', 'Beverage classroom demo often starts with a water-miscible teaching solvent. A chocolate fat system may need an oil-leaning story instead.', '{"question":"Carrier choice depends on","options":["The favorite color of the bottle","The application and physical form","Whether the formula is already approved","Social media trends"],"correct_index":1}', 'Match carrier to application; still verify status and specs.'),
('11111111-1111-4111-8111-111111114009', 'ar', 'المذيبات والحاملات', 'مقارنة الحاملات القابلة للامتزاج بالماء والمائلة للزيت.', 'البروبيلين غليكول والإيثانول والتري أسيتين والزيت النباتي حاملات تعليمية مختلفة. تغيّر الذوبان واللزوجة وطريقة دخول النكهة.', 'عرض المشروب الصفّي يبدأ غالباً بمذيب قابل للامتزاج بالماء. أما نظام دهني فقد يحتاج قصة مائلة للزيت.', '{"question":"Carrier choice depends on","options":["The favorite color of the bottle","The application and physical form","Whether the formula is already approved","Social media trends"],"correct_index":1,"explanation":""}', 'طابق الحامل مع التطبيق وما زلت تتحقق من الحالة والمواصفة.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114010', '11111111-1111-4111-8111-111111111105', 2, 'draft', 8, false, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114010', 'en', 'Liquid, emulsion, and powder thinking', 'Explain why the same profile needs a new form.', 'A liquid teaching flavor, an emulsion, and a plated or spray-dried powder are different products. Heat, carriers, and surface area change what the consumer smells.

Do not convert a liquid 100% formula into a powder by wish. Write a new version.', 'Rev C of the citrus teaching flavor is a powder concept: carrier maltodextrin story + adsorbed liquid concentrate. New code family, new PPE for dust.', '{"question":"Changing physical form requires","options":["The same document with no notes","A new version and fresh checks","Automatic commercial approval","Deleting safety notes"],"correct_index":1}', 'New form = new version, new process risks, same teaching banner.'),
('11111111-1111-4111-8111-111111114010', 'ar', 'التفكير بالسائل والمستحلب والمسحوق', 'شرح لماذا يحتاج نفس الملف شكلاً جديداً.', 'النكهة السائلة والمستحلب والمسحوق منتجات مختلفة. لا تحوّل صيغة سائلة إلى مسحوق بالتمني. اكتب إصداراً جديداً.', 'المراجعة C مفهوم مسحوق: حامل + ركازة ممتزة. عائلة رموز جديدة ومعدات وقاية للغبار.', '{"question":"Changing physical form requires","options":["The same document with no notes","A new version and fresh checks","Automatic commercial approval","Deleting safety notes"],"correct_index":1,"explanation":""}', 'شكل جديد = إصدار جديد ومخاطر جديدة ونفس الشعار التعليمي.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.quizzes (id, course_id, module_id, kind, pass_percent, status, title, title_ar)
VALUES ('11111111-1111-4111-8111-111111116105', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111105', 'module', 70, 'draft', 'Solvents, Carriers, and Physical Form check', 'اختبار المذيبات والحاملات والشكل الفيزيائي')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118013', '11111111-1111-4111-8111-111111116105', 1, 'A solvent is chosen for', 'A solvent is chosen for')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120049', '11111111-1111-4111-8111-111111118013', 1, 'Decoration only', 'Decoration only', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120050', '11111111-1111-4111-8111-111111118013', 2, 'Compatibility with the application', 'Compatibility with the application', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120051', '11111111-1111-4111-8111-111111118013', 3, 'Skipping regulations', 'Skipping regulations', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120052', '11111111-1111-4111-8111-111111118013', 4, 'Hiding defects', 'Hiding defects', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118014', '11111111-1111-4111-8111-111111116105', 2, 'Powder and liquid versions are', 'Powder and liquid versions are')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120053', '11111111-1111-4111-8111-111111118014', 1, 'Always identical documents', 'Always identical documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120054', '11111111-1111-4111-8111-111111118014', 2, 'Different versions with different risks', 'Different versions with different risks', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120055', '11111111-1111-4111-8111-111111118014', 3, 'Automatically approved', 'Automatically approved', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120056', '11111111-1111-4111-8111-111111118014', 4, 'Illegal to teach', 'Illegal to teach', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118015', '11111111-1111-4111-8111-111111116105', 3, 'Dusting a powder flavor requires', 'Dusting a powder flavor requires')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120057', '11111111-1111-4111-8111-111111118015', 1, 'No PPE', 'No PPE', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120058', '11111111-1111-4111-8111-111111118015', 2, 'Updated handling notes', 'Updated handling notes', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120059', '11111111-1111-4111-8111-111111118015', 3, 'A sales launch', 'A sales launch', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120060', '11111111-1111-4111-8111-111111118015', 4, 'Deleting codes', 'Deleting codes', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lab_assignments (id, course_id, module_id, title, title_ar, brief, brief_ar, status)
VALUES ('11111111-1111-4111-8111-111111122102', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111105', 'Carrier selection worksheet', 'ورقة اختيار الحامل', 'Teaching Prototype — For supervised R&D training and evaluation only. Verify food-grade status, supplier specifications, intended application, and applicable EU, USA, and India requirements. This formula is not commercially approved.

Pick a teaching carrier for (1) a still flavored water and (2) a fat-based filling. Justify solubility, handling, and what you would verify on a real spec sheet.', 'نموذج تعليمي — للتدريب والتقييم في البحث والتطوير تحت إشراف فقط. تحقق من صلاحية الدرجة الغذائية ومواصفات المورّد والاستخدام المقصود ومتطلبات الاتحاد الأوروبي والولايات المتحدة والهند. هذه الصيغة ليست معتمدة تجارياً.

اختر حاملاً تعليمياً لماء منكّه وللحشوة الدهنية. برّر الذوبان والتداول وما ستتحقق منه في مواصفة حقيقية.', 'draft')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_modules (id, course_id, sort_order, status, estimated_minutes, has_lab)
VALUES ('11111111-1111-4111-8111-111111111106', '11111111-1111-4111-8111-111111111111', 6, 'draft', 29, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.module_translations (module_id, language, title, objective, summary)
VALUES
('11111111-1111-4111-8111-111111111106', 'en', 'Application Systems', 'Build a small application matrix before claiming success.', 'Application Systems'),
('11111111-1111-4111-8111-111111111106', 'ar', 'أنظمة التطبيق', 'بناء مصفوفة تطبيق صغيرة قبل ادعاء النجاح.', 'أنظمة التطبيق')
ON CONFLICT (module_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114011', '11111111-1111-4111-8111-111111111106', 1, 'draft', 9, false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114011', 'en', 'The base rewrites the flavor', 'Predict how sugar, acid, fat, and protein move a profile.', 'Sugar can lift fruit and hide bitterness. Acid can make citrus read juicier or harsher. Fat can mute top notes and hold lactones. Protein and minerals can bind aroma.

Therefore “it tasted fine in PG on a blotter” is not an application result.', 'Same TP-BEV-CV-01 at 0.08% in acidified sugar water vs 0.08% in 3% fat milk. Students expect less peel and more creamy vanilla in milk.', '{"question":"An application test is required because","options":["Blotter results equal beverages","The food system changes perception","It replaces regulatory checks","It approves export"],"correct_index":1}', 'Always re-taste in the intended base.'),
('11111111-1111-4111-8111-111111114011', 'ar', 'القاعدة تعيد كتابة النكهة', 'توقع كيف تحرّك السكر والحمض والدهن والبروتين الملف.', 'قد يرفع السكر الفاكهة ويخفي المرارة. وقد يجعل الحمض الحمضيات أكثر عصيرية أو أقسى. الدهن يخمِد القمة ويمسك اللاكتونات.

لذلك فإن «طعمها جيد على الورق» ليست نتيجة تطبيق.', 'نفس TP-BEV-CV-01 في ماء سكري حامض مقابل حليب 3٪ دهن. يُتوقع قشرة أقل وفانيليا أوضح في الحليب.', '{"question":"An application test is required because","options":["Blotter results equal beverages","The food system changes perception","It replaces regulatory checks","It approves export"],"correct_index":1,"explanation":""}', 'أعد التذوق دائماً في القاعدة المقصودة.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114012', '11111111-1111-4111-8111-111111111106', 2, 'draft', 8, false, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114012', 'en', 'Application matrix thinking', 'Record dose, process, and result in a grid.', 'A matrix is a table: application, dose, process (cold, pasteurized, baked), result, next action. It prevents “we tried something” from becoming folklore.', 'Water 0.06% cold = thin; water 0.10% cold = peel-heavy; yogurt 0.08% = acceptable citrus, weak vanilla. Next: Rev B vanilla +0.40 in concentrate.', '{"question":"An application matrix should capture","options":["Only the winning sample","Dose, process, result, and next action","Personal opinions without codes","A commercial invoice"],"correct_index":1}', 'Grid the trials. Keep codes on cups.'),
('11111111-1111-4111-8111-111111114012', 'ar', 'تفكير مصفوفة التطبيق', 'تسجيل الجرعة والعملية والنتيجة في شبكة.', 'المصفوفة جدول: التطبيق، الجرعة، العملية، النتيجة، الإجراء التالي.', 'ماء 0.06٪ بارد = ضعيف؛ 0.10٪ = قشرة عالية؛ زبادي 0.08٪ = حمضيات مقبولة وفانيليا ضعيفة.', '{"question":"An application matrix should capture","options":["Only the winning sample","Dose, process, result, and next action","Personal opinions without codes","A commercial invoice"],"correct_index":1,"explanation":""}', 'جدول التجارب وأبقِ الرموز على الأكواب.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.quizzes (id, course_id, module_id, kind, pass_percent, status, title, title_ar)
VALUES ('11111111-1111-4111-8111-111111116106', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111106', 'module', 70, 'draft', 'Application Systems check', 'اختبار أنظمة التطبيق')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118016', '11111111-1111-4111-8111-111111116106', 1, 'Fat in the base often', 'Fat in the base often')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120061', '11111111-1111-4111-8111-111111118016', 1, 'Increases all top notes equally', 'Increases all top notes equally', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120062', '11111111-1111-4111-8111-111111118016', 2, 'Mutes some top notes and holds heavier notes', 'Mutes some top notes and holds heavier notes', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120063', '11111111-1111-4111-8111-111111118016', 3, 'Removes the need for a formula', 'Removes the need for a formula', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120064', '11111111-1111-4111-8111-111111118016', 4, 'Approves the flavor', 'Approves the flavor', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118017', '11111111-1111-4111-8111-111111116106', 2, 'A matrix is useful because', 'A matrix is useful because')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120065', '11111111-1111-4111-8111-111111118017', 1, 'It replaces safety', 'It replaces safety', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120066', '11111111-1111-4111-8111-111111118017', 2, 'It turns trials into a decision record', 'It turns trials into a decision record', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120067', '11111111-1111-4111-8111-111111118017', 3, 'It is optional decoration', 'It is optional decoration', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120068', '11111111-1111-4111-8111-111111118017', 4, 'It is a certificate', 'It is a certificate', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118018', '11111111-1111-4111-8111-111111116106', 3, 'Dose should be', 'Dose should be')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120069', '11111111-1111-4111-8111-111111118018', 1, 'Guessed after launch', 'Guessed after launch', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120070', '11111111-1111-4111-8111-111111118018', 2, 'Written per application row', 'Written per application row', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120071', '11111111-1111-4111-8111-111111118018', 3, 'The same in every food', 'The same in every food', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120072', '11111111-1111-4111-8111-111111118018', 4, 'Hidden from the team', 'Hidden from the team', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lab_assignments (id, course_id, module_id, title, title_ar, brief, brief_ar, status)
VALUES ('11111111-1111-4111-8111-111111122103', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111106', 'Mini application matrix', 'مصفوفة تطبيق مصغّرة', 'Teaching Prototype — For supervised R&D training and evaluation only. Verify food-grade status, supplier specifications, intended application, and applicable EU, USA, and India requirements. This formula is not commercially approved.

Build a 4-row matrix for one teaching flavor: two doses × two bases (water and a dairy or bakery story). Record coded notes and one next revision.', 'نموذج تعليمي — للتدريب والتقييم في البحث والتطوير تحت إشراف فقط. تحقق من صلاحية الدرجة الغذائية ومواصفات المورّد والاستخدام المقصود ومتطلبات الاتحاد الأوروبي والولايات المتحدة والهند. هذه الصيغة ليست معتمدة تجارياً.

ابنِ مصفوفة من 4 صفوف: جرعتان × قاعدتان. سجّل ملاحظات مرمّزة ومراجعة تالية.', 'draft')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_modules (id, course_id, sort_order, status, estimated_minutes, has_lab)
VALUES ('11111111-1111-4111-8111-111111111107', '11111111-1111-4111-8111-111111111111', 7, 'draft', 28, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.module_translations (module_id, language, title, objective, summary)
VALUES
('11111111-1111-4111-8111-111111111107', 'en', 'Stability, Interaction, and Shelf Life', 'Name the main classroom stability risks and how to record them.', 'Stability, Interaction, and Shelf Life'),
('11111111-1111-4111-8111-111111111107', 'ar', 'الثبات والتفاعل والعمر الافتراضي', 'تسمية مخاطر الثبات الصفّية وكيفية تسجيلها.', 'الثبات والتفاعل والعمر الافتراضي')
ON CONFLICT (module_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114013', '11111111-1111-4111-8111-111111111107', 1, 'draft', 9, false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114013', 'en', 'Heat, pH, light, and packaging', 'Predict which notes fade or become dirty.', 'Citrus top notes are famous for fading with heat and oxygen. Some aldehydes change character. Light and poor closures accelerate loss. Low pH can help some citrus stories and damage others.

Classroom tests are screening, not shelf-life validation.', 'Pasteurize the teaching beverage concept in a water bath if the instructor approves the setup. Compare coded cold vs heated samples the same day.', '{"question":"A classroom heat check is","options":["A legal shelf-life study","A screening observation that must be labeled as such","Proof of commercial stability","Enough to skip packaging notes"],"correct_index":1}', 'Screen, label the limits, do not claim validated shelf life.'),
('11111111-1111-4111-8111-111111114013', 'ar', 'الحرارة والحموضة والضوء والتعبئة', 'توقع أي النوتات تتلاشى أو تتسخ.', 'نوتات الحمضيات العليا مشهورة بالتلاشي مع الحرارة والأكسجين. الاختبارات الصفّية فحص وليست إثبات عمر افتراضي.', 'إذا وافق المشرف، قارن عينة باردة بعينة مسخّنة في اليوم نفسه بأكواد.', '{"question":"A classroom heat check is","options":["A legal shelf-life study","A screening observation that must be labeled as such","Proof of commercial stability","Enough to skip packaging notes"],"correct_index":1,"explanation":""}', 'افحص، اذكر الحدود، ولا تدّعِ عمرًا افتراضيًا مثبتًا.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114014', '11111111-1111-4111-8111-111111111107', 2, 'draft', 7, false, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114014', 'en', 'Interactions and off-notes', 'Record cardboard, cooked, and sulfury defects without blame theater.', 'Off-notes are data. Cardboard can mean oxidation. Cooked can mean heat or a heavy peel oil. Sulfury can mean a useful trace that became too high.

Write the defect, the sample code, and the suspected mechanism. Then revise once.', '248: cardboard 2/5 after 24 h open beaker — suspected oxidation. Action: close immediately, add note to storage instructions.', '{"question":"An off-note should be","options":["Deleted from the notebook","Coded, described, and linked to a next action","Used to approve the product","Posted publicly with the formula"],"correct_index":1}', 'Defects drive one documented revision.'),
('11111111-1111-4111-8111-111111114014', 'ar', 'التفاعلات والنوتات المعيبة', 'تسجيل عيوب الكرتون والمطبوخ والكبريت دون مسرح لوم.', 'العيوب بيانات. اكتب العيب ورمز العينة والآلية المتوقعة ثم راجع مرة واحدة.', '248: كرتون 2/5 بعد 24 ساعة في كأس مفتوح — شبهة أكسدة. الإجراء: أغلق فوراً.', '{"question":"An off-note should be","options":["Deleted from the notebook","Coded, described, and linked to a next action","Used to approve the product","Posted publicly with the formula"],"correct_index":1,"explanation":""}', 'العيوب تقود مراجعة موثّقة واحدة.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.quizzes (id, course_id, module_id, kind, pass_percent, status, title, title_ar)
VALUES ('11111111-1111-4111-8111-111111116107', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111107', 'module', 70, 'draft', 'Stability, Interaction, and Shelf Life check', 'اختبار الثبات والتفاعل والعمر الافتراضي')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118019', '11111111-1111-4111-8111-111111116107', 1, 'Classroom stability work is', 'Classroom stability work is')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120073', '11111111-1111-4111-8111-111111118019', 1, 'Full validation', 'Full validation', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120074', '11111111-1111-4111-8111-111111118019', 2, 'Screening with stated limits', 'Screening with stated limits', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120075', '11111111-1111-4111-8111-111111118019', 3, 'A legal dossier', 'A legal dossier', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120076', '11111111-1111-4111-8111-111111118019', 4, 'Unnecessary', 'Unnecessary', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118020', '11111111-1111-4111-8111-111111116107', 2, 'Citrus top notes often', 'Citrus top notes often')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120077', '11111111-1111-4111-8111-111111118020', 1, 'Ignore oxygen', 'Ignore oxygen', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120078', '11111111-1111-4111-8111-111111118020', 2, 'Fade with heat and oxidation', 'Fade with heat and oxidation', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120079', '11111111-1111-4111-8111-111111118020', 3, 'Become saltier', 'Become saltier', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120080', '11111111-1111-4111-8111-111111118020', 4, 'Prove India compliance', 'Prove India compliance', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118021', '11111111-1111-4111-8111-111111116107', 3, 'The correct response to cardboard is', 'The correct response to cardboard is')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120081', '11111111-1111-4111-8111-111111118021', 1, 'Hide the sample', 'Hide the sample', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120082', '11111111-1111-4111-8111-111111118021', 2, 'Record code, intensity, and a hypothesis', 'Record code, intensity, and a hypothesis', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120083', '11111111-1111-4111-8111-111111118021', 3, 'Launch the SKU', 'Launch the SKU', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120084', '11111111-1111-4111-8111-111111118021', 4, 'Add politics', 'Add politics', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_modules (id, course_id, sort_order, status, estimated_minutes, has_lab)
VALUES ('11111111-1111-4111-8111-111111111108', '11111111-1111-4111-8111-111111111111', 8, 'draft', 30, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.module_translations (module_id, language, title, objective, summary)
VALUES
('11111111-1111-4111-8111-111111111108', 'en', 'Safety, Regulatory, and Documentation Discipline', 'Practice PPE, intended use, and multi-region verification reminders.', 'Safety, Regulatory, and Documentation Discipline'),
('11111111-1111-4111-8111-111111111108', 'ar', 'السلامة والتنظيم وانضباط التوثيق', 'ممارسة معدات الوقاية والاستخدام المقصود وتذكيرات التحقق متعدد المناطق.', 'السلامة والتنظيم وانضباط التوثيق')
ON CONFLICT (module_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114015', '11111111-1111-4111-8111-111111111108', 1, 'draft', 8, false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114015', 'en', 'PPE, hygiene, and intended use', 'List minimum bench controls for a teaching lab.', 'Minimum teaching controls: closed shoes, eye protection when required, gloves for concentrated materials, labeled vessels, no tasting from the concentrate bottle, no food in the weigh area, and instructor approval before any heat.

Intended use belongs on the sheet: “cold beverage classroom demo, not for unsupervised consumption, not for sale.”', 'Label: TP-BEV-CV-01 Rev B / Teaching Prototype / not for sale / instructor: _____ / date.', '{"question":"Concentrated teaching flavors should be","options":["Tasted neat from the stock bottle","Handled with labeled vessels and agreed PPE","Taken home for parties","Described as commercially approved"],"correct_index":1}', 'PPE, labels, intended use, instructor control.'),
('11111111-1111-4111-8111-111111114015', 'ar', 'معدات الوقاية والنظافة والاستخدام المقصود', 'عدّ الحد الأدنى لضوابط المختبر التعليمي.', 'الحد الأدنى: حذاء مغلق، حماية للعين عند الحاجة، قفازات للمركزات، أوعية موسومة، لا تذوق من زجاجة الركازة، وموافقة المشرف قبل أي تسخين.', 'بطاقة: TP-BEV-CV-01 المراجعة B / نموذج تعليمي / ليس للبيع / المشرف: _____ / التاريخ.', '{"question":"Concentrated teaching flavors should be","options":["Tasted neat from the stock bottle","Handled with labeled vessels and agreed PPE","Taken home for parties","Described as commercially approved"],"correct_index":1,"explanation":""}', 'وقاية، بطاقات، استخدام مقصود، وإشراف.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114016', '11111111-1111-4111-8111-111111111108', 2, 'draft', 10, false, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114016', 'en', 'EU, USA, and India verification reminders', 'Know what you must still verify outside this course.', 'This course does not grant regulatory clearance. Before any non-training use, a qualified person must verify:

• whether each material is permitted for the intended food category
• use-level limits and specification identity
• labeling, allergen, and religious claims if any
• EU flavoring rules and any national limits
• USA FDA / FEMA GRAS or other applicable status
• India FSSAI flavoring and additive expectations

Students record a checklist, they do not stamp “approved.”', 'Checklist row: TP-LIM-001 / identity to be confirmed on supplier CoA / EU status TBD / USA status TBD / India status TBD / not approved in this class.', '{"question":"Completing this lesson means","options":["The formula is cleared for EU, USA, and India","You know which checks remain before any real use","You may sell the teaching prototype","Food-grade status is automatic"],"correct_index":1}', 'Remind, checklist, never self-approve a commercial use.'),
('11111111-1111-4111-8111-111111114016', 'ar', 'تذكيرات التحقق في الاتحاد الأوروبي وأمريكا والهند', 'معرفة ما يجب التحقق منه خارج هذه الدورة.', 'هذه الدورة لا تمنح تصريحاً تنظيمياً. قبل أي استخدام خارج التدريب يجب أن يتحقق شخص مؤهل من السماح بالمادة، وحدود الاستخدام، والوسم، وقواعد الاتحاد الأوروبي، ووضع الولايات المتحدة، وتوقعات الهند.

يسجّل الطالب قائمة تحقق ولا يختم «معتمد».', 'صف القائمة: TP-LIM-001 / الهوية تُؤكد من شهادة المورّد / الوضع في الاتحاد الأوروبي وأمريكا والهند قيد التحقق / غير معتمد في هذا الصف.', '{"question":"Completing this lesson means","options":["The formula is cleared for EU, USA, and India","You know which checks remain before any real use","You may sell the teaching prototype","Food-grade status is automatic"],"correct_index":1,"explanation":""}', 'ذكّر، ضع قائمة، ولا تعتمد استخداماً تجارياً بنفسك.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.quizzes (id, course_id, module_id, kind, pass_percent, status, title, title_ar)
VALUES ('11111111-1111-4111-8111-111111116108', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111108', 'module', 70, 'draft', 'Safety, Regulatory, and Documentation Discipline check', 'اختبار السلامة والتنظيم وانضباط التوثيق')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118022', '11111111-1111-4111-8111-111111116108', 1, 'This Academy clears commercial sale', 'This Academy clears commercial sale')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120085', '11111111-1111-4111-8111-111111118022', 1, 'True', 'True', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120086', '11111111-1111-4111-8111-111111118022', 2, 'False — training only', 'False — training only', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120087', '11111111-1111-4111-8111-111111118022', 3, 'Only in India', 'Only in India', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120088', '11111111-1111-4111-8111-111111118022', 4, 'Only if sweet', 'Only if sweet', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118023', '11111111-1111-4111-8111-111111116108', 2, 'EU, USA, and India checks are', 'EU, USA, and India checks are')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120089', '11111111-1111-4111-8111-111111118023', 1, 'Optional decoration', 'Optional decoration', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120090', '11111111-1111-4111-8111-111111118023', 2, 'Required before non-training use', 'Required before non-training use', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120091', '11111111-1111-4111-8111-111111118023', 3, 'Replaced by a teaching code', 'Replaced by a teaching code', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120092', '11111111-1111-4111-8111-111111118023', 4, 'The same document', 'The same document', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118024', '11111111-1111-4111-8111-111111116108', 3, 'PPE is', 'PPE is')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120093', '11111111-1111-4111-8111-111111118024', 1, 'Optional if the flavor smells nice', 'Optional if the flavor smells nice', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120094', '11111111-1111-4111-8111-111111118024', 2, 'Part of the laboratory method', 'Part of the laboratory method', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120095', '11111111-1111-4111-8111-111111118024', 3, 'A marketing claim', 'A marketing claim', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120096', '11111111-1111-4111-8111-111111118024', 4, 'Proof of GRAS', 'Proof of GRAS', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_modules (id, course_id, sort_order, status, estimated_minutes, has_lab)
VALUES ('11111111-1111-4111-8111-111111111109', '11111111-1111-4111-8111-111111111111', 9, 'draft', 31, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.module_translations (module_id, language, title, objective, summary)
VALUES
('11111111-1111-4111-8111-111111111109', 'en', 'Laboratory Practice and Teaching Prototypes', 'Weigh, label, store, and revise like a supervised bench.', 'Laboratory Practice and Teaching Prototypes'),
('11111111-1111-4111-8111-111111111109', 'ar', 'ممارسة المختبر والنماذج التعليمية', 'الوزن والوسم والتخزين والمراجعة كمنضدة تحت إشراف.', 'ممارسة المختبر والنماذج التعليمية')
ON CONFLICT (module_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114017', '11111111-1111-4111-8111-111111111109', 1, 'draft', 8, false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114017', 'en', 'Teaching prototypes versus commercial products', 'State the difference without ambiguity.', 'Teaching Prototype — For supervised R&D training and evaluation only. Verify food-grade status, supplier specifications, intended application, and applicable EU, USA, and India requirements. This formula is not commercially approved.

A commercial flavor has a released specification, approved materials, validated process, and a responsible company. A teaching prototype has a learning objective and a supervisor. Mixing the two languages is a professional failure.', 'Wrong sentence: “This class lemon is approved for beverages in the USA.” Right sentence: “This class lemon is a teaching prototype; USA status was not established here.”', '{"question":"A teaching prototype is","options":["A released commercial flavor","A supervised training artifact with limits","An export certificate","A substitute for FSSAI approval"],"correct_index":1}', 'Never describe a teaching formula as commercially approved.'),
('11111111-1111-4111-8111-111111114017', 'ar', 'النماذج التعليمية مقابل المنتجات التجارية', 'ذكر الفرق بلا لبس.', 'نموذج تعليمي — للتدريب والتقييم في البحث والتطوير تحت إشراف فقط. تحقق من صلاحية الدرجة الغذائية ومواصفات المورّد والاستخدام المقصود ومتطلبات الاتحاد الأوروبي والولايات المتحدة والهند. هذه الصيغة ليست معتمدة تجارياً.

النكهة التجارية لها مواصفة صادرة ومواد مقبولة وعملية مثبتة. النموذج التعليمي له هدف تعلّمي ومشرف. خلط اللغتين فشل مهني.', 'جملة خاطئة: «ليمون الصف معتمد للمشروبات في أمريكا». جملة صحيحة: «هذا نموذج تعليمي ولم يُثبت وضع أمريكا هنا».', '{"question":"A teaching prototype is","options":["A released commercial flavor","A supervised training artifact with limits","An export certificate","A substitute for FSSAI approval"],"correct_index":1,"explanation":""}', 'لا تصف صيغة تعليمية بأنها معتمدة تجارياً.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114018', '11111111-1111-4111-8111-111111111109', 2, 'draft', 11, false, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114018', 'en', 'Weighing, labeling, storage, and revision', 'Execute one clean revision cycle.', 'Weigh largest to smallest when practical, close vessels, record actuals if they differ from targets, and label immediately.

Storage: tight closure, away from heat and light, teaching-only shelf, date, owner.

Revision: keep Rev A, create Rev B, write the reason from coded sensory, do not overwrite history.', 'Storage line: 20–25 °C, dark, 30-day teaching hold, then supervised disposal. Not a commercial shelf-life claim.', '{"question":"Overwriting Rev A is wrong because","options":["History is part of professional control","Computers forbid it","It automatically approves Rev B","PPE requires it"],"correct_index":0}', 'Actuals, labels, storage limits, one written revision.'),
('11111111-1111-4111-8111-111111114018', 'ar', 'الوزن والوسم والتخزين والمراجعة', 'تنفيذ دورة مراجعة نظيفة واحدة.', 'زن من الأكبر إلى الأصغر عند الإمكان، أغلق الأوعية، سجّل الفعلي إن اختلف، وسمّ فوراً. احتفظ بالمراجعة A وأنشئ B مع السبب.', 'التخزين: 20–25 م، ظلام، حفظ تعليمي 30 يوماً ثم إتلاف تحت إشراف. ليس ادعاء عمر تجاري.', '{"question":"Overwriting Rev A is wrong because","options":["History is part of professional control","Computers forbid it","It automatically approves Rev B","PPE requires it"],"correct_index":0,"explanation":""}', 'أوزان فعلية، بطاقات، حدود تخزين، ومراجعة مكتوبة واحدة.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.quizzes (id, course_id, module_id, kind, pass_percent, status, title, title_ar)
VALUES ('11111111-1111-4111-8111-111111116109', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111109', 'module', 70, 'draft', 'Laboratory Practice and Teaching Prototypes check', 'اختبار ممارسة المختبر والنماذج التعليمية')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118025', '11111111-1111-4111-8111-111111116109', 1, 'Commercial language on a class formula is', 'Commercial language on a class formula is')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120097', '11111111-1111-4111-8111-111111118025', 1, 'Professional', 'Professional', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120098', '11111111-1111-4111-8111-111111118025', 2, 'Misleading and not allowed in this Academy', 'Misleading and not allowed in this Academy', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120099', '11111111-1111-4111-8111-111111118025', 3, 'Required by FDA', 'Required by FDA', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120100', '11111111-1111-4111-8111-111111118025', 4, 'A certificate', 'A certificate', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118026', '11111111-1111-4111-8111-111111116109', 2, 'Revision control means', 'Revision control means')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120101', '11111111-1111-4111-8111-111111118026', 1, 'Delete the old file', 'Delete the old file', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120102', '11111111-1111-4111-8111-111111118026', 2, 'Keep history and state the reason', 'Keep history and state the reason', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120103', '11111111-1111-4111-8111-111111118026', 3, 'Change codes randomly', 'Change codes randomly', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120104', '11111111-1111-4111-8111-111111118026', 4, 'Skip tasting', 'Skip tasting', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118027', '11111111-1111-4111-8111-111111116109', 3, 'Storage notes should', 'Storage notes should')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120105', '11111111-1111-4111-8111-111111118027', 1, 'Claim 18-month retail life', 'Claim 18-month retail life', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120106', '11111111-1111-4111-8111-111111118027', 2, 'State teaching hold conditions and limits', 'State teaching hold conditions and limits', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120107', '11111111-1111-4111-8111-111111118027', 3, 'Be empty', 'Be empty', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120108', '11111111-1111-4111-8111-111111118027', 4, 'List politics', 'List politics', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lab_assignments (id, course_id, module_id, title, title_ar, brief, brief_ar, status)
VALUES ('11111111-1111-4111-8111-111111122104', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111109', 'Supervised bench worksheet', 'ورقة المنضدة تحت الإشراف', 'Teaching Prototype — For supervised R&D training and evaluation only. Verify food-grade status, supplier specifications, intended application, and applicable EU, USA, and India requirements. This formula is not commercially approved.

Complete a bench packet: PPE list, 100% formula, actual weights, labels, storage, coded tasting of Rev A, and Rev B with one reason. Attach photos only if your instructor allows.', 'نموذج تعليمي — للتدريب والتقييم في البحث والتطوير تحت إشراف فقط. تحقق من صلاحية الدرجة الغذائية ومواصفات المورّد والاستخدام المقصود ومتطلبات الاتحاد الأوروبي والولايات المتحدة والهند. هذه الصيغة ليست معتمدة تجارياً.

أكمل حزمة المنضدة: وقاية، صيغة 100٪، أوزان فعلية، بطاقات، تخزين، تذوق مرمّز للمراجعة A، والمراجعة B بسبب واحد.', 'draft')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_modules (id, course_id, sort_order, status, estimated_minutes, has_lab)
VALUES ('11111111-1111-4111-8111-111111111110', '11111111-1111-4111-8111-111111111111', 10, 'draft', 30, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.module_translations (module_id, language, title, objective, summary)
VALUES
('11111111-1111-4111-8111-111111111110', 'en', 'Capstone Studio', 'Deliver one complete teaching dossier from brief to recommendation.', 'Capstone Studio'),
('11111111-1111-4111-8111-111111111110', 'ar', 'استوديو المشروع الختامي', 'تسليم ملف تعليمي كامل من الموجز إلى التوصية.', 'استوديو المشروع الختامي')
ON CONFLICT (module_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114019', '11111111-1111-4111-8111-111111111110', 1, 'draft', 10, false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114019', 'en', 'From brief to recommendation', 'Assemble every required capstone section.', 'The capstone is one teaching flavor dossier:

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

Every formula page must show: Teaching Prototype — For supervised R&D training and evaluation only. Verify food-grade status, supplier specifications, intended application, and applicable EU, USA, and India requirements. This formula is not commercially approved.', 'Recommendation language: “Rev B is the preferred teaching prototype for cold sugar-acid water in this class. It is not released, not sold, and not cleared for EU, USA, or India.”', '{"question":"The capstone recommendation must include","options":["A claim of commercial approval","A preferred revision plus explicit limitations","A political statement","A hidden formula"],"correct_index":1}', 'Complete dossier, teaching banner, honest limits.'),
('11111111-1111-4111-8111-111111114019', 'ar', 'من الموجز إلى التوصية', 'تجميع كل أقسام المشروع الختامي المطلوبة.', 'المشروع الختامي ملف نكهة تعليمي واحد يضم الموجز، والصيغة 100٪، والرموز والإصدارات، والأوزان، والتحضير، والوقاية، والتخزين، ومصفوفة التطبيق، والتقييم المرمّز، ومراجعة واحدة، والقائمة التنظيمية، والتوصية، والحدود.

يجب أن يظهر على كل صفحة: نموذج تعليمي — للتدريب والتقييم في البحث والتطوير تحت إشراف فقط. تحقق من صلاحية الدرجة الغذائية ومواصفات المورّد والاستخدام المقصود ومتطلبات الاتحاد الأوروبي والولايات المتحدة والهند. هذه الصيغة ليست معتمدة تجارياً.', 'لغة التوصية: «المراجعة B هي النموذج التعليمي المفضّل لماء سكري حامض في هذا الصف. ليست إصداراً تجارياً وليست م Cleared للاتحاد الأوروبي أو أمريكا أو الهند.»', '{"question":"The capstone recommendation must include","options":["A claim of commercial approval","A preferred revision plus explicit limitations","A political statement","A hidden formula"],"correct_index":1,"explanation":""}', 'ملف كامل، شعار تعليمي، وحدود صادقة.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.lessons (id, module_id, sort_order, status, estimated_minutes, has_lab, has_quiz)
VALUES ('11111111-1111-4111-8111-111111114020', '11111111-1111-4111-8111-111111111110', 2, 'draft', 8, false, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lesson_translations (lesson_id, language, title, objective, body, worked_example, knowledge_check, summary)
VALUES
('11111111-1111-4111-8111-111111114020', 'en', 'One documented revision', 'Show that you can change a formula for a coded reason.', 'Pick one defect from your coded panel. Change one or two lines only. Recalculate to 100.00. Retaste. Write whether the defect moved.

If nothing improved, say so. A negative result is a valid teaching outcome.', 'Reason: coded pithy 3/5. Change: TP-CIT-002 10.00 → 8.00. Result: pithy 1/5, juicy slightly lower. Accept Rev B for class.', '{"question":"A good revision","options":["Changes twenty materials at once with no reason","Changes little, cites the coded defect, and reports the new result","Deletes Rev A","Claims global approval"],"correct_index":1}', 'Small change, written reason, new total, new result.'),
('11111111-1111-4111-8111-111111114020', 'ar', 'مراجعة موثّقة واحدة', 'إظهار القدرة على تغيير الصيغة بسبب مرمّز.', 'اختر عيباً واحداً من اللجنة المرمّزة. غيّر سطراً أو سطرين. أعد الحساب إلى 100.00. أعد التذوق. النتيجة السلبية نتيجة تعليمية صحيحة.', 'السبب: قشرة مرة 3/5. التغيير: 10.00 → 8.00. النتيجة: 1/5. قبول المراجعة B للصف.', '{"question":"A good revision","options":["Changes twenty materials at once with no reason","Changes little, cites the coded defect, and reports the new result","Deletes Rev A","Claims global approval"],"correct_index":1,"explanation":""}', 'تغيير صغير، سبب مكتوب، مجموع جديد، نتيجة جديدة.')
ON CONFLICT (lesson_id, language) DO NOTHING;

INSERT INTO public.quizzes (id, course_id, module_id, kind, pass_percent, status, title, title_ar)
VALUES ('11111111-1111-4111-8111-111111116110', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111110', 'module', 70, 'draft', 'Capstone Studio check', 'اختبار استوديو المشروع الختامي')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118028', '11111111-1111-4111-8111-111111116110', 1, 'The capstone is complete only if', 'The capstone is complete only if')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120109', '11111111-1111-4111-8111-111111118028', 1, 'The aroma is strong', 'The aroma is strong', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120110', '11111111-1111-4111-8111-111111118028', 2, 'All required sections are present', 'All required sections are present', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120111', '11111111-1111-4111-8111-111111118028', 3, 'A friend likes it', 'A friend likes it', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120112', '11111111-1111-4111-8111-111111118028', 4, 'It is sold', 'It is sold', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118029', '11111111-1111-4111-8111-111111116110', 2, 'Limitations should mention', 'Limitations should mention')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120113', '11111111-1111-4111-8111-111111118029', 1, 'Nothing', 'Nothing', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120114', '11111111-1111-4111-8111-111111118029', 2, 'Training-only status and unverified regional requirements', 'Training-only status and unverified regional requirements', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120115', '11111111-1111-4111-8111-111111118029', 3, 'A launch date', 'A launch date', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120116', '11111111-1111-4111-8111-111111118029', 4, 'A celebrity', 'A celebrity', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_questions (id, quiz_id, sort_order, prompt, prompt_ar)
VALUES ('11111111-1111-4111-8111-111111118030', '11111111-1111-4111-8111-111111116110', 3, 'One revision means', 'One revision means')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120117', '11111111-1111-4111-8111-111111118030', 1, 'Unlimited secret edits', 'Unlimited secret edits', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120118', '11111111-1111-4111-8111-111111118030', 2, 'A documented Rev B with a coded reason', 'A documented Rev B with a coded reason', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120119', '11111111-1111-4111-8111-111111118030', 3, 'Deleting evidence', 'Deleting evidence', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_answers (id, question_id, sort_order, body, body_ar, is_correct)
VALUES ('11111111-1111-4111-8111-111111120120', '11111111-1111-4111-8111-111111118030', 4, 'Skipping the matrix', 'Skipping the matrix', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lab_assignments (id, course_id, module_id, title, title_ar, brief, brief_ar, status)
VALUES ('11111111-1111-4111-8111-111111122105', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111110', 'Capstone dossier upload', 'رفع ملف المشروع الختامي', 'Teaching Prototype — For supervised R&D training and evaluation only. Verify food-grade status, supplier specifications, intended application, and applicable EU, USA, and India requirements. This formula is not commercially approved.

Submit the thirteen-section dossier. Incomplete sections fail the capstone even if the flavor smells pleasant.', 'نموذج تعليمي — للتدريب والتقييم في البحث والتطوير تحت إشراف فقط. تحقق من صلاحية الدرجة الغذائية ومواصفات المورّد والاستخدام المقصود ومتطلبات الاتحاد الأوروبي والولايات المتحدة والهند. هذه الصيغة ليست معتمدة تجارياً.

أرسل الملف ذا الأقسام الثلاثة عشر. نقص قسم يرسب المشروع حتى لو كانت الرائحة لطيفة.', 'draft')
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.learning_path_courses (path_id, course_id, sort_order)
SELECT p.id, '11111111-1111-4111-8111-111111111111', 1
FROM public.learning_paths p
WHERE p.slug = 'flavor-fundamentals'
ON CONFLICT (path_id, course_id) DO NOTHING;

INSERT INTO public.course_versions (course_id, version_number, status, notes, snapshot)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  1,
  'draft',
  'Initial bilingual draft of Introduction to Flavor Science and Formulation',
  '{"modules":10,"status":"draft"}'::jsonb
)
ON CONFLICT (course_id, version_number) DO NOTHING;
