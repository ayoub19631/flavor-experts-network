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

## 2) LinkedIn Developers (OpenID Connect)

1. [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) → تطبيقك
2. **Products** → فعّل **Sign In with LinkedIn using OpenID Connect**
3. **Auth → Redirect URLs:** أضف **بالضبط**:
   ```
   https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/oauth/callback
   ```
4. انسخ **Client ID** و **Client Secret**

> إذا ظهر خطأ `redirect_uri does not match` فالمسار في LinkedIn لا يطابق السطر أعلاه حرفياً.

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
