/**
 * Fix seed data — use correct column names matching actual DB schema
 * Re-run: node seed-fix.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://imucfofvdwfyexdwrsfe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltdWNmb2Z2ZHdmeWV4ZHdyc2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NjA0OTUsImV4cCI6MjA5NDMzNjQ5NX0.yXlA1IaZp2goVre-0rf4ecHd70W-JEVadrwwOQqNKzE";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log("Fixing seed data...\n");

  // Fix members (only columns that exist: full_name, email, role, specialty, linkedin_url, avatar_url, is_featured)
  const members = [
    { full_name: "Dr. Layla Hassan", role: "Chief Flavor Scientist", specialty: "Natural Flavors | IFF Arabia | Dubai", is_featured: true, avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200" },
    { full_name: "Mohammed Al-Farsi", role: "Senior Perfumer", specialty: "Oud & Oriental | Symrise GCC | Abu Dhabi", is_featured: true, avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200" },
    { full_name: "Fatima Al-Zahra", role: "Food Technologist", specialty: "Dairy Applications | Nestlé MENA | Cairo", is_featured: false, avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200" },
    { full_name: "Omar Al-Rashid", role: "Senior R&D Manager", specialty: "Beverage Flavors | Takasago | Riyadh", is_featured: true, avatar_url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200" },
    { full_name: "Aisha Benali", role: "QA & Regulatory Lead", specialty: "Regulatory Compliance | Givaudan | Casablanca", is_featured: false, avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200" },
    { full_name: "Khalid Al-Mansouri", role: "Flavor Chemist", specialty: "Savory Applications | Firmenich | Jeddah", is_featured: false, avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200" },
    { full_name: "Nour Al-Deen", role: "Application Specialist", specialty: "Confectionery | MANE Arabia | Kuwait", is_featured: true, avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200" },
    { full_name: "Yousef Al-Otaibi", role: "Sensory Science Director", specialty: "Consumer Research | PepsiCo | Riyadh", is_featured: true, avatar_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200" },
    { full_name: "Rania Khalil", role: "Innovation Director", specialty: "Clean Label | Flavor House ME | Beirut", is_featured: false, avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200" },
    { full_name: "Mariam Tahir", role: "Flavor Development Lead", specialty: "Home Care | Unilever Arabia | Dubai", is_featured: false, avatar_url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200" },
  ];

  let mOk = 0, mFail = 0;
  for (const m of members) {
    const { error } = await supabase.from("members").insert(m);
    if (error && !error.message.includes("duplicate") && !error.message.includes("unique")) {
      console.log("  ⚠️  Member:", m.full_name, "-", error.message);
      mFail++;
    } else { mOk++; }
  }
  console.log(`Members: ${mOk} ok, ${mFail} failed`);

  // Fix news (only columns that exist: title, content, summary, category, image_url, source_url, author, is_published, published_at)
  const news = [
    { title: "Global Flavor Market Reaches $18.9B in 2025", summary: "MENA region leads with 14.2% YoY growth. Halal food demand and premium beverages drive expansion across GCC markets.", category: "Market Trends", image_url: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600", author: "Flavor Experts Analytics", is_published: true },
    { title: "AI-Powered Flavor Prediction Cuts R&D Time by 60%", summary: "Leading flavor houses deploying machine learning to predict consumer preferences. Givaudan and IFF report major breakthroughs.", category: "Innovation", image_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600", author: "Food Science Quarterly", is_published: true },
    { title: "New GCC Clean Label Regulations Effective 2026", summary: "Updated guidelines require full traceability for natural flavor declarations. Key compliance steps for MENA manufacturers.", category: "Regulatory", image_url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600", author: "GSO Flavor Council", is_published: true },
    { title: "Saudi Vision 2030 Drives 40% Surge in Food Tech Investment", summary: "Localization initiatives and national food security goals accelerate the flavor industry in the Kingdom.", category: "Market Trends", image_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600", author: "SFDA Innovation Hub", is_published: true },
  ];

  let nOk = 0, nFail = 0;
  for (const n of news) {
    const { error } = await supabase.from("industry_news").insert(n);
    if (error && !error.message.includes("duplicate")) {
      console.log("  ⚠️  News:", n.title.substring(0, 40), "-", error.message);
      nFail++;
    } else { nOk++; }
  }
  console.log(`News: ${nOk} ok, ${nFail} failed`);

  // Fix resources (only columns that exist: title, description, type, link, category, image_url, premium, is_published)
  const resources = [
    { title: "Halal Flavor Certification — Complete Guide", description: "Certification bodies, ingredient screening, and documentation requirements for GCC and MENA markets.", type: "PDF", category: "Regulatory", image_url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600", premium: false, is_published: true },
    { title: "Advanced Encapsulation Technologies", description: "Spray drying, coacervation, and cyclodextrin inclusion for controlled flavor release in food systems.", type: "Course", category: "Technical", image_url: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600", premium: true, is_published: true },
    { title: "MENA Beverage Flavor Trends 2025-2030", description: "Emerging preferences in Arabic coffee, energy drinks, and premium water segments. Market data included.", type: "Report", category: "Market Research", image_url: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600", premium: true, is_published: true },
    { title: "Sensory Evaluation: A Practical Handbook", description: "Protocols for triangle tests, descriptive analysis, and consumer preference panels.", type: "Guide", category: "Technical", image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600", premium: false, is_published: true },
  ];

  let rOk = 0, rFail = 0;
  for (const r of resources) {
    const { error } = await supabase.from("educational_resources").insert(r);
    if (error && !error.message.includes("duplicate")) {
      console.log("  ⚠️  Resource:", r.title.substring(0, 40), "-", error.message);
      rFail++;
    } else { rOk++; }
  }
  console.log(`Resources: ${rOk} ok, ${rFail} failed`);

  console.log("\n✅ Done!");
}

main().catch(console.error);
