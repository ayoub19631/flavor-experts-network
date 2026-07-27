import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://imucfofvdwfyexdwrsfe.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";

if (!supabaseServiceKey) {
  console.log("Need service key - using anon key approach instead");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function upgradeToProUsers() {
  // Upgrade demo.user to professional
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) { console.error(error); return; }
  
  const demoUser = users.users.find(u => u.email === "demo.user@flavorexperts.net");
  if (demoUser) {
    await supabase.auth.admin.updateUserById(demoUser.id, {
      user_metadata: { 
        ...demoUser.user_metadata,
        subscription_tier: "professional",
        full_name: "Ahmed Al-Rashidi",
        role: "Senior Flavor Scientist",
        company: "Arabian Flavor Labs",
        location: "Riyadh, Saudi Arabia",
        bio: "Senior flavor scientist with 10+ years in MENA food industry, specializing in halal flavor development."
      }
    });
    await supabase.from("user_profiles").update({ subscription_tier: "professional" }).eq("id", demoUser.id);
    console.log("✅ demo.user upgraded to professional!");
  }
}

upgradeToProUsers();
