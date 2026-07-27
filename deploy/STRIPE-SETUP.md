# إعداد Stripe + التحقق من البريد — Flavor Experts Network

## الجزء 1: Stripe (الدفع الإلكتروني)

### 1) إنشاء حساب Stripe
1. ادخل إلى [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. أكمل بيانات الشركة والتحقق من الهوية

### 2) إنشاء المنتجات والأسعار
في Stripe Dashboard → **Product catalog** → **Add product**:

| الخطة | السعر الشهري | السعر السنوي |
|-------|-------------|-------------|
| Professional | $29/month | $278/year (~20% off) |
| Enterprise | $99/month | $950/year (~20% off) |

لكل منتج: **Add price** → Recurring → Monthly و Annual  
انسخ **Price ID** لكل سعر (يبدأ بـ `price_...`)

### 3) مفاتيح API
Stripe Dashboard → **Developers** → **API keys**:
- **Publishable key** → `pk_live_...` أو `pk_test_...`
- **Secret key** → `sk_live_...` أو `sk_test_...`

### 4) Webhook
Developers → **Webhooks** → **Add endpoint**:

```
URL: https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/stripe-webhook
```

Events:
- `checkout.session.completed`
- `customer.subscription.deleted`
- `customer.subscription.updated` (اختياري)

انسخ **Signing secret** → `whsec_...`

### 5) Supabase Secrets
Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_ENT_MONTHLY=price_...
STRIPE_PRICE_ENT_ANNUAL=price_...
SITE_URL=https://flavorexpertsnetwork.com
SUPABASE_SERVICE_ROLE_KEY=(from Project Settings → API)
```

### 6) Vercel Environment Variables
Vercel → Project **frontend** → **Settings** → **Environment Variables**:

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

ثم أعد النشر: `npx vercel --prod`

### 7) اختبار
1. استخدم بطاقة Stripe Test: `4242 4242 4242 4242`
2. سجّل دخول → Pricing → Subscribe
3. يجب التوجيه لـ Stripe Checkout ثم العودة للوحة التحكم

---

## الجزء 2: التحقق من البريد (Supabase Auth)

### 1) تفعيل تأكيد البريد
Supabase Dashboard → **Authentication** → **Providers** → **Email**:
- ✅ **Enable Email provider**
- ✅ **Confirm email** (إلزامي)
- ✅ **Secure email change** (موصى به)

### 2) Redirect URLs
Authentication → **URL Configuration**:

```
Site URL: https://flavorexpertsnetwork.com
Redirect URLs:
  https://flavorexpertsnetwork.com/auth/callback
  https://flavorexpertsnetwork.com/email-verified
  https://flavorexpertsnetwork.com/**
  http://localhost:5173/auth/callback
  http://localhost:3000/auth/callback
```

### 3) قالب البريد (OTP 6 أرقام)
Authentication → **Email Templates** → **Confirm signup**:

```html
<h2>Verify your email — Flavor Experts Network</h2>
<p>Your verification code is:</p>
<h1 style="font-size:32px;letter-spacing:8px;">{{ .Token }}</h1>
<p>Or click this link:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm my email</a></p>
<p>This code expires in 60 minutes.</p>
```

### 4) SMTP (اختياري — لتحسين التسليم)
Authentication → **SMTP Settings**:
- استخدم SendGrid / Resend / Amazon SES
- أو ابقَ على بريد Supabase الافتراضي للبداية

### 5) Leaked password protection
Authentication → **Policies** → فعّل **Leaked password protection**

---

## ملخص سريع

| المكان | المتغير |
|--------|---------|
| Vercel | `VITE_STRIPE_PUBLISHABLE_KEY` |
| Supabase Secrets | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` |
| Supabase Auth | Confirm email ON + Redirect URLs + OTP template |

بعد الإعداد، جميع المستخدمين الجدد **يجب** تأكيد بريدهم قبل الوصول للوحة التحكم أو الاشتراك.
