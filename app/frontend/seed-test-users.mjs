/**
 * Seed Test Users — Flavor Experts Network
 * Creates 2 demo accounts: individual + company
 * Uses Supabase anon key via signUp (no service role needed)
 *
 * Run: node seed-test-users.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://imucfofvdwfyexdwrsfe.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltdWNmb2Z2ZHdmeWV4ZHdyc2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NjA0OTUsImV4cCI6MjA5NDMzNjQ5NX0.yXlA1IaZp2goVre-0rf4ecHd70W-JEVadrwwOQqNKzE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Demo Accounts ─────────────────────────────────────────────────────────────
const INDIVIDUAL_USER = {
  email: "demo.user@flavorexperts.net",
  password: "Demo@12345",
  metadata: {
    full_name: "Ahmed Al-Rashidi",
    role: "Flavor Scientist",
    company: "Arabian Flavor Labs",
    location: "Riyadh, Saudi Arabia",
    bio: "Senior flavor scientist with 12+ years of experience in beverage and dairy applications. Specialist in Middle Eastern flavor profiles.",
    account_type: "individual",
    subscription_tier: "premium",
    linkedin_url: "https://linkedin.com/in/ahmed-alrashidi",
    avatar_url: "",
  },
};

const COMPANY_USER = {
  email: "demo.company@flavorexperts.net",
  password: "Company@12345",
  metadata: {
    full_name: "Sara Al-Mahmoud",
    role: "Enterprise Account Manager",
    company: "Gulf Aroma Industries",
    company_name: "Gulf Aroma Industries",
    company_size: "201-500",
    industry: "Flavor Manufacturing",
    website: "https://gulfaroma.example.com",
    location: "Dubai, UAE",
    bio: "Leading flavor manufacturing company specializing in GCC market solutions for food & beverage industry.",
    account_type: "company",
    subscription_tier: "enterprise",
    contact_phone: "+971-4-555-0123",
  },
};

// ─── Helper ────────────────────────────────────────────────────────────────────
async function createUser(userConfig, label) {
  console.log(`\n⏳ Creating ${label}...`);

  const { data, error } = await supabase.auth.signUp({
    email: userConfig.email,
    password: userConfig.password,
    options: {
      data: userConfig.metadata,
      emailRedirectTo: `${SUPABASE_URL}/auth/v1/callback`,
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      console.log(`  ℹ️  ${label} already exists — trying sign in...`);
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: userConfig.email,
        password: userConfig.password,
      });
      if (signInError) {
        console.error(`  ❌ Sign in failed: ${signInError.message}`);
        return null;
      }
      console.log(`  ✅ ${label} signed in successfully (already exists)`);
      return signInData.user;
    }
    console.error(`  ❌ Failed: ${error.message}`);
    return null;
  }

  const user = data?.user;
  console.log(`  ✅ ${label} created!`);
  console.log(`     ID: ${user?.id}`);
  console.log(`     Email: ${user?.email}`);
  console.log(`     Confirmed: ${user?.email_confirmed_at ? "YES ✅" : "NO ⏳ (check inbox)"}`);

  // Upsert user profile
  if (user?.id) {
    const profileData = {
      id: user.id,
      email: userConfig.email,
      full_name: userConfig.metadata.full_name,
      role: userConfig.metadata.role,
      company: userConfig.metadata.company,
      location: userConfig.metadata.location || "",
      bio: userConfig.metadata.bio || "",
      subscription_tier: userConfig.metadata.subscription_tier,
      account_type: userConfig.metadata.account_type,
      linkedin_url: userConfig.metadata.linkedin_url || "",
      avatar_url: userConfig.metadata.avatar_url || "",
      is_verified: true,
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert(profileData, { onConflict: "id" });

    if (profileError) {
      console.log(`  ⚠️  Profile upsert warning: ${profileError.message}`);
    } else {
      console.log(`  ✅ Profile saved to database`);
    }

    // If company account, also save enterprise request
    if (userConfig.metadata.account_type === "company") {
      const enterpriseData = {
        user_id: user.id,
        email: userConfig.email,
        company_name: userConfig.metadata.company_name,
        company_size: userConfig.metadata.company_size,
        industry: userConfig.metadata.industry,
        website: userConfig.metadata.website,
        contact_name: userConfig.metadata.full_name,
        contact_phone: userConfig.metadata.contact_phone,
        status: "approved",
        created_at: new Date().toISOString(),
      };

      const { error: enterpriseError } = await supabase
        .from("enterprise_requests")
        .upsert(enterpriseData, { onConflict: "user_id" });

      if (enterpriseError) {
        console.log(`  ⚠️  Enterprise request warning: ${enterpriseError.message}`);
      } else {
        console.log(`  ✅ Enterprise request saved`);
      }
    }
  }

  return user;
}

// ─── Insert Demo Members ───────────────────────────────────────────────────────
async function insertDemoMembers() {
  console.log("\n⏳ Inserting demo members directory...");

  const members = [
    { name: "Dr. Layla Hassan", title: "Chief Flavor Scientist", company: "IFF Arabia", location: "Dubai", specialty: "Natural Flavors", is_featured: true, linkedin_url: "" },
    { name: "Mohammed Al-Farsi", title: "Perfumer & Flavor Expert", company: "Symrise GCC", location: "Abu Dhabi", specialty: "Oud & Oriental", is_featured: true, linkedin_url: "" },
    { name: "Fatima Al-Zahra", title: "Food Technologist", company: "Nestlé MENA", location: "Cairo", specialty: "Dairy Applications", is_featured: false, linkedin_url: "" },
    { name: "Omar Al-Rashid", title: "Senior R&D Manager", company: "Takasago MENA", location: "Riyadh", specialty: "Beverage Flavors", is_featured: true, linkedin_url: "" },
    { name: "Aisha Benali", title: "Quality Assurance Lead", company: "Givaudan MENA", location: "Casablanca", specialty: "Regulatory Compliance", is_featured: false, linkedin_url: "" },
    { name: "Khalid Al-Mansouri", title: "Flavor Chemist", company: "Firmenich MEA", location: "Jeddah", specialty: "Savory Applications", is_featured: false, linkedin_url: "" },
    { name: "Nour Al-Deen", title: "Application Specialist", company: "MANE Arabia", location: "Kuwait City", specialty: "Confectionery", is_featured: true, linkedin_url: "" },
    { name: "Rania Khalil", title: "Innovation Director", company: "Flavor House ME", location: "Beirut", specialty: "Clean Label", is_featured: false, linkedin_url: "" },
    { name: "Yousef Al-Otaibi", title: "Sensory Scientist", company: "PepsiCo MENA", location: "Riyadh", specialty: "Consumer Insights", is_featured: true, linkedin_url: "" },
    { name: "Mariam Tahir", title: "Flavor Development Lead", company: "Unilever Arabia", location: "Dubai", specialty: "Home Care", is_featured: false, linkedin_url: "" },
  ];

  for (const member of members) {
    const { error } = await supabase.from("members").upsert(member, { onConflict: "name" });
    if (error && !error.message.includes("duplicate")) {
      console.log(`  ⚠️  Member ${member.name}: ${error.message}`);
    }
  }
  console.log("  ✅ Demo members inserted");
}

// ─── Insert Demo News ──────────────────────────────────────────────────────────
async function insertDemoNews() {
  console.log("\n⏳ Inserting demo news articles...");

  const news = [
    {
      title: "Global Flavor Market Reaches $18.9B — MENA Region Leads Growth",
      title_ar: "سوق النكهات العالمي يصل إلى 18.9 مليار دولار — منطقة الشرق الأوسط تقود النمو",
      summary: "The global flavor and fragrance market hit a record $18.9 billion in 2025, with MENA region showing 14.2% YoY growth driven by premium halal food demand.",
      summary_ar: "وصل سوق النكهات والعطور العالمي إلى رقم قياسي بلغ 18.9 مليار دولار في 2025، مع نمو بنسبة 14.2% في منطقة الشرق الأوسط.",
      category: "Market Insights",
      category_ar: "تحليلات السوق",
      date: "2025-12-15",
      image_url: "",
      source: "Flavor Experts Analytics",
      is_featured: true,
    },
    {
      title: "Saudi Arabia's Vision 2030 Drives 40% Surge in Food Tech Investment",
      title_ar: "رؤية السعودية 2030 تدفع نمو الاستثمار في تكنولوجيا الغذاء بنسبة 40%",
      summary: "Food tech investments in Saudi Arabia surged 40% year-on-year as Vision 2030 initiatives accelerate localization of the flavor and food science sector.",
      summary_ar: "ارتفعت استثمارات تقنية الغذاء في المملكة العربية السعودية بنسبة 40% على أساس سنوي.",
      category: "Industry News",
      category_ar: "أخبار الصناعة",
      date: "2025-11-28",
      image_url: "",
      source: "SFDA Innovation Hub",
      is_featured: true,
    },
    {
      title: "New Clean Label Regulations: What GCC Flavor Scientists Must Know",
      title_ar: "لوائح العلامة النظيفة الجديدة: ما يجب أن يعرفه علماء النكهات في دول الخليج",
      summary: "GCC regulatory bodies have released updated clean label guidelines affecting natural flavor declarations. Key deadlines and compliance steps explained.",
      summary_ar: "أصدرت الهيئات التنظيمية في دول الخليج إرشادات محدثة للعلامات النظيفة تؤثر على إعلانات النكهات الطبيعية.",
      category: "Regulatory",
      category_ar: "اللوائح التنظيمية",
      date: "2025-10-10",
      image_url: "",
      source: "GSO Flavor Council",
      is_featured: false,
    },
    {
      title: "AI-Powered Flavor Prediction: How Machine Learning is Reshaping R&D",
      title_ar: "التنبؤ بالنكهات بالذكاء الاصطناعي: كيف يُعيد التعلم الآلي تشكيل البحث والتطوير",
      summary: "Leading flavor houses are deploying AI models to predict flavor perception, reducing formulation cycles from months to days.",
      summary_ar: "تنشر دور النكهات الرائدة نماذج الذكاء الاصطناعي للتنبؤ بإدراك النكهة، مما يقلل دورات التركيب من أشهر إلى أيام.",
      category: "Technology",
      category_ar: "التكنولوجيا",
      date: "2025-09-22",
      image_url: "",
      source: "Food Science Quarterly",
      is_featured: true,
    },
  ];

  for (const article of news) {
    const { error } = await supabase.from("industry_news").upsert(article, { onConflict: "title" });
    if (error && !error.message.includes("duplicate")) {
      console.log(`  ⚠️  News "${article.title.substring(0, 40)}...": ${error.message}`);
    }
  }
  console.log("  ✅ Demo news inserted");
}

// ─── Insert Demo Resources ─────────────────────────────────────────────────────
async function insertDemoResources() {
  console.log("\n⏳ Inserting educational resources...");

  const resources = [
    {
      title: "The Complete Guide to Halal Flavor Certification",
      title_ar: "الدليل الشامل لشهادات النكهات الحلال",
      description: "Comprehensive guide covering certification bodies, ingredient screening, and documentation requirements for GCC markets.",
      description_ar: "دليل شامل يغطي هيئات الاعتماد ومتطلبات الوثائق لأسواق دول الخليج.",
      category: "Regulatory",
      category_ar: "تنظيمي",
      type: "PDF",
      is_premium: false,
      url: "#",
    },
    {
      title: "Advanced Encapsulation Technologies for Flavor Protection",
      title_ar: "تقنيات التغليف المتقدمة لحماية النكهات",
      description: "Deep dive into spray drying, coacervation, and cyclodextrin inclusion techniques for controlled flavor release.",
      description_ar: "تعمق في تقنيات التجفيف بالرذاذ والتضمين الدوري للإفراج المتحكم في النكهة.",
      category: "Technical",
      category_ar: "تقني",
      type: "Course",
      is_premium: true,
      url: "#",
    },
    {
      title: "MENA Beverage Flavor Trends 2025-2030",
      title_ar: "اتجاهات نكهات المشروبات في منطقة الشرق الأوسط 2025-2030",
      description: "Market research report on emerging flavor preferences in Arabic coffee, energy drinks, and premium water segments.",
      description_ar: "تقرير بحث سوقي حول تفضيلات النكهات الناشئة في قهوة عربية ومشروبات الطاقة.",
      category: "Market Research",
      category_ar: "بحوث السوق",
      type: "Report",
      is_premium: true,
      url: "#",
    },
    {
      title: "Sensory Evaluation Methods: A Practical Handbook",
      title_ar: "طرق التقييم الحسي: دليل عملي",
      description: "Step-by-step protocols for triangle tests, descriptive analysis, and consumer preference panels.",
      description_ar: "بروتوكولات خطوة بخطوة لاختبارات المثلثات والتحليل الوصفي ولجان تفضيل المستهلك.",
      category: "Technical",
      category_ar: "تقني",
      type: "PDF",
      is_premium: false,
      url: "#",
    },
  ];

  for (const resource of resources) {
    const { error } = await supabase.from("educational_resources").upsert(resource, { onConflict: "title" });
    if (error && !error.message.includes("duplicate")) {
      console.log(`  ⚠️  Resource "${resource.title.substring(0, 40)}...": ${error.message}`);
    }
  }
  console.log("  ✅ Demo resources inserted");
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("   Flavor Experts Network — Test Data Seeder");
  console.log("═══════════════════════════════════════════════════");

  // Create individual user
  const individualUser = await createUser(INDIVIDUAL_USER, "👤 Individual User");

  // Create company user
  const companyUser = await createUser(COMPANY_USER, "🏢 Company User");

  // Insert demo content
  await insertDemoMembers();
  await insertDemoNews();
  await insertDemoResources();

  console.log("\n═══════════════════════════════════════════════════");
  console.log("   ✅ SEED COMPLETE");
  console.log("═══════════════════════════════════════════════════");
  console.log("\n🔐 TEST CREDENTIALS:");
  console.log("\n  Individual Account:");
  console.log(`  Email   : ${INDIVIDUAL_USER.email}`);
  console.log(`  Password: ${INDIVIDUAL_USER.password}`);
  console.log(`  Role    : Premium Member`);
  console.log("\n  Company Account:");
  console.log(`  Email   : ${COMPANY_USER.email}`);
  console.log(`  Password: ${COMPANY_USER.password}`);
  console.log(`  Role    : Enterprise`);
  console.log("\n⚠️  NOTE: Supabase may require email confirmation.");
  console.log("   If sign-in fails, disable email confirmation in:");
  console.log("   Supabase Dashboard → Authentication → Providers → Email → 'Confirm Email'");
  console.log("═══════════════════════════════════════════════════\n");
}

main().catch(console.error);
