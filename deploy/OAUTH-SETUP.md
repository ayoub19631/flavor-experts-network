# إعداد Google + LinkedIn OAuth — Flavor Experts Network

## الطريقة الجديدة (Edge Function — موصى بها)

المنصة تستخدم دالة `oauth` في Supabase Edge Functions. **لا تحتاج** تفعيل Google/LinkedIn من Supabase Providers.

### Redirect URI (Google + LinkedIn)
```
https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/oauth?action=callback
```

---

## 1) Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) → OAuth client (Web application)
2. **Authorized JavaScript origins:**
   ```
   https://flavorexpertsnetwork.com
   https://imucfofvdwfyexdwrsfe.supabase.co
   http://localhost:5173
   ```
3. **Authorized redirect URIs:**
   ```
   https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/oauth?action=callback
   ```
4. انسخ **Client ID** و **Client Secret**

---

## 2) LinkedIn Developers (OpenID Connect)

1. [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) → Create app
2. **Products** → فعّل **Sign In with LinkedIn using OpenID Connect**
3. **Auth → Redirect URLs:**
   ```
   https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/oauth?action=callback
   ```
4. انسخ **Client ID** و **Client Secret**

---

## 3) Supabase Secrets

```bash
cp deploy/oauth.env.example deploy/oauth.env
# عدّل deploy/oauth.env وأضف المفاتيح
node deploy/configure-oauth.mjs
npx supabase functions deploy oauth --project-ref imucfofvdwfyexdwrsfe
```

---

## 4) Supabase Redirect URLs

Authentication → **URL Configuration**:
```
Site URL: https://flavorexpertsnetwork.com

Redirect URLs:
https://flavorexpertsnetwork.com/**
https://flavorexpertsnetwork.com/auth/callback
http://localhost:5173/**
http://localhost:5173/auth/callback
```

---

## اختبار

1. https://flavorexpertsnetwork.com/auth
2. **Continue with Google** أو **Continue with LinkedIn**
3. بعد الموافقة → `/auth/callback` → `/dashboard`

---

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| `provider is not enabled` | تم إصلاحه — استخدم Edge Function oauth (لا Supabase Providers) |
| `not configured yet` | أضف secrets عبر `configure-oauth.mjs` |
| Redirect URI mismatch | استخدم الرابط الكامل مع `?action=callback` |
| Invalid client | راجع Client ID/Secret في Google/LinkedIn |
