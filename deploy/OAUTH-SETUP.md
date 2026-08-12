# إعداد Google + LinkedIn OAuth — Flavor Experts Network

## الطريقة (Edge Function)

المنصة تستخدم دالة `oauth` في Supabase Edge Functions مع **OpenID Connect** لـ LinkedIn.

### Redirect URI (الأساسي — استخدمه في Google و LinkedIn)
```
https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/oauth/callback
```

### Redirect URI (قديم — أبقِه إن كان مضافاً مسبقاً)
```
https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/oauth?action=callback
```

---

## 1) Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) → OAuth client (Web application)
2. **Authorized JavaScript origins:**
   ```
   https://flavorexpertsnetwork.com
   https://www.flavorexpertsnetwork.com
   https://imucfofvdwfyexdwrsfe.supabase.co
   http://localhost:5173
   ```
3. **Authorized redirect URIs:** أضف الـ URI الأساسي أعلاه (+ القديم إن لزم)
4. انسخ **Client ID** و **Client Secret**

---

## 2) LinkedIn Developers — تطبيقك الحالي (Flavor Experts Network)

التطبيق موجود مسبقاً — **لا تنشئ تطبيقاً جديداً**.

| الحقل | القيمة |
|--------|--------|
| App name | Flavor Experts Network |
| Client ID | `77ispdsj1ggqx6` (مطابق لما في Supabase) |
| Redirect URI المطلوب | انظر أدناه |

### خطوات إجبارية في لوحة LinkedIn (بالترتيب)

1. افتح [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) → **Flavor Experts Network**
2. تبويب **Products**
   - فعّل / اطلب **Sign In with LinkedIn using OpenID Connect**
   - انتظر حتى تصبح الحالة **Added** / **Approved** (غالباً فوري)
3. تبويب **Auth** → **Authorized redirect URLs for your app**
   - أضف **حرفياً** (بدون مسافات أو `/` زيادة في النهاية):
     ```
     https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/oauth/callback
     ```
   - اختياري (توافق قديم):  
     `https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/oauth?action=callback`
   - احفظ **Update**
4. تبويب **Settings** (ما يظهر في لقطتك)
   - اضغط **Verify** بجانب LinkedIn Page إن طُلب التحقق من الشركة
   - أكمل طلب التحقق من حساب مسؤول صفحة الشركة على LinkedIn
   - حدّث **business email** من الشريط الأصفر أعلى الصفحة إن ظهر
5. تبويب **Auth** → انسخ **Primary Client Secret**
   - إذا غيّرت الـ Secret أو أنشأت واحداً جديداً، حدّثه في Supabase:
     ```bash
     supabase secrets set LINKEDIN_CLIENT_ID=77ispdsj1ggqx6 LINKEDIN_CLIENT_SECRET='YOUR_SECRET' --project-ref imucfofvdwfyexdwrsfe
     npx supabase functions deploy oauth --project-ref imucfofvdwfyexdwrsfe --no-verify-jwt
     ```

> **ملاحظة:** تحذير «This app is not verified as being associated with this company» لا يمنع دائماً تسجيل الدخول، لكن LinkedIn يطلبه غالباً للمنتجات/الإنتاج. الأهم لنجاح الدخول هو: **Products = OpenID Connect** + **Redirect URL مطابق**.

> إذا ظهر خطأ `redirect_uri does not match` فالمسار في LinkedIn لا يطابق سطر الـ callback أعلاه حرفياً.

---

## 3) Supabase Secrets

مطلوب أيضاً: `OAUTH_STATE_SECRET` (لا تغيّره عشوائياً بعد التفعيل).

```bash
cp deploy/oauth.env.example deploy/oauth.env
# عدّل المفاتيح
node deploy/configure-oauth.mjs
npx supabase functions deploy oauth --project-ref imucfofvdwfyexdwrsfe --no-verify-jwt
```

Frontend: `VITE_OAUTH_ENABLED=true` في بناء الإنتاج (Vercel / GitHub Actions).

---

## 4) Supabase Redirect URLs

Authentication → **URL Configuration**:
```
Site URL: https://flavorexpertsnetwork.com

Redirect URLs:
https://flavorexpertsnetwork.com/**
https://flavorexpertsnetwork.com/auth/callback
https://www.flavorexpertsnetwork.com/**
https://www.flavorexpertsnetwork.com/auth/callback
http://localhost:5173/**
http://localhost:5173/auth/callback
flavorexperts://auth/callback
```

---

## اختبار

1. https://flavorexpertsnetwork.com/auth
2. **Continue with LinkedIn**
3. بعد الموافقة → `/auth/callback` → `/dashboard`

---

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| `redirect_uri does not match` | أضف `/oauth/callback` في LinkedIn Auth redirect URLs |
| `OAUTH_STATE_SECRET must be set` | `supabase secrets set OAUTH_STATE_SECRET=...` |
| لا يظهر زر LinkedIn | تأكد `VITE_OAUTH_ENABLED=true` في بناء Vercel |
| لا يرجع إيميل | فعّل OpenID Connect + scope email على تطبيق LinkedIn |
| Invalid OAuth callback | انتهت صلاحية state (15 دقيقة) أو تغيّر السر |
