import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = { "Content-Type": "application/json" };

async function updateSubscription(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tier: string,
  active: boolean,
) {
  const { error } = await supabase
    .from("user_profiles")
    .update({
      subscription_tier: tier,
      subscription_active: active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;
}

Deno.serve(async (req: Request) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Stripe webhook not configured", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();
  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status && session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
        return new Response(JSON.stringify({ received: true, skipped: "unpaid session" }), { headers: corsHeaders });
      }

      const userId = session.metadata?.user_id || session.client_reference_id;
      const plan = session.metadata?.plan || "professional";
      if (userId) await updateSubscription(supabase, userId, plan, true);
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (userId) {
        const active = sub.status === "active" || sub.status === "trialing";
        const tier = active ? (sub.metadata?.plan || "professional") : "free";
        await updateSubscription(supabase, userId, tier, active);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (userId) await updateSubscription(supabase, userId, "free", false);
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const userId = invoice.metadata?.user_id;
      if (userId) await updateSubscription(supabase, userId, "free", false);
    }

    return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });
  } catch (err) {
    console.error("[stripe-webhook]", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
