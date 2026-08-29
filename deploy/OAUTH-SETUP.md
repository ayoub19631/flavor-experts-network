# إعداد Google + LinkedIn OAuth — Flavor Experts Network

## الطريقة (Edge Function)

المنصة تستخدم دالة `oauth` في Supabase Edge Functions.

**تسجيل الدخول عبر LinkedIn متوقف مؤقتاً في الواجهة.** استخدم Google أو البريد.

تطبيق لينكدإن الحالي **لا يملك منتج دخول مفعّلاً** (يرفض `openid` و`r_emailaddress`). إذا أردت إعادته لاحقاً:

1. https://www.linkedin.com/developers/apps
2. افتح التطبيق `77ispdsj1ggqx6`
3. **Products** → **Sign In with LinkedIn using OpenID Connect** → Request / Enable
4. أعد تجربة الدخول (لا حاجة لتغيير الكود بعد التفعيل)

الدالة تجرب أولاً `openid profile email` ثم تلقائياً `r_liteprofile r_emailaddress`.

### Redirect URI (المسجّل حالياً — استخدمه في Google و LinkedIn)
```
https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/oauth?action=callback
```

### Redirect URI (اختياري — أضفه أيضاً إن أردت المسار الجديد)
```
https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/oauth/callback
```

يمكن تجاوز الرابط بسر `LINKEDIN_REDIRECT_URI` أو `OAUTH_REDIRECT_URI`.

---

## 1) Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) → OAuth client (Web application)
2. **Authorized JavaScript origins:**
   ```
   https://flavorexpertsnetwork.com
   https://www.flavorexpertsnetwork.com
   https://imucfofvdwfyexdwrsfe.supabase.co
   http://localhost:3000
   http://localhost:3001
   http://localhost:5173
   ```
3. **Authorized redirect URIs:** أضف الـ URI الأساسي أعلاه
4. انسخ **Client ID** و **Client Secret**

---

## 2) LinkedIn Developers

1. [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) → تطبيقك
2. **Products** → فعّل واحداً على الأقل:
   - **Sign In with LinkedIn** (يعطي `r_liteprofile` و `r_emailaddress`) — هذا الافتراضي
   - أو **Sign In with LinkedIn using OpenID Connect** ثم عيّن `LINKEDIN_SCOPES`
3. **Auth → Redirect URLs:** أضف **بالضبط**:
   ```
   https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/oauth?action=callback
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
http://localhost:3000/**
http://localhost:3001/**
http://localhost:5173/**
http://localhost:5173/auth/callback
flavorexperts://auth/callback
```

---

## اختبار

1. https://flavorexpertsnetwork.com/auth
2. **Continue with LinkedIn**
3. بعد الموافقة → `/auth/callback` → المجتمع `/`

---

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| `Scope "openid" is not authorized` | لا تطلب openid، أو فعّل منتج OpenID Connect. الكود الحالي يستخدم النطاقات الكلاسيكية. |
| `redirect_uri does not match` | أضف `.../oauth?action=callback` في LinkedIn Auth redirect URLs |
| `OAUTH_STATE_SECRET must be set` | `supabase secrets set OAUTH_STATE_SECRET=...` |
| لا يظهر زر LinkedIn | متعمّد حالياً — الدخول عبر Google أو البريد فقط |
| لا يرجع إيميل | فعّل منتج الدخول + صلاحية البريد على تطبيق LinkedIn |
| Invalid OAuth callback | انتهت صلاحية state (15 دقيقة) أو تغيّر السر |
