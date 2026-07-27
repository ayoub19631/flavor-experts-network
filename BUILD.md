# خبراء النكهات - دليل بناء التطبيقات

## الهيكل العام

```
موقع خبراء النكهات/
├── app/frontend/          ← تطبيق الويب (React + Vite)
│   ├── capacitor.config.ts   ← إعداد Capacitor للجوال
│   └── android/              ← مشروع Android (يُنشأ تلقائياً)
├── electron/              ← تطبيق سطح المكتب
│   ├── main.js               ← العملية الرئيسية
│   ├── preload.js            ← جسر الأمان
│   └── web/                  ← نسخة الويب المبنية (تُنسخ تلقائياً)
└── build.mjs              ← سكريبت البناء الموحّد
```

---

## 🌐 تطبيق الويب (Development)

```bash
cd app/frontend
pnpm install
pnpm dev
```

---

## 🖥️ تطبيق سطح المكتب (Electron)

### التطوير (يتصل بـ localhost)
```bash
# 1. شغّل تطبيق الويب أولاً
cd app/frontend && pnpm dev

# 2. في نافذة أخرى، شغّل Electron
cd electron
npm install
npm run dev
```

### بناء التوزيع
```bash
# من المجلد الجذري - يبني الويب أولاً ثم ينسخه لـ Electron
node build.mjs --electron

# ثم من مجلد electron:
cd electron
npm run build:win     # ← Windows (.exe installer + portable)
npm run build:mac     # ← macOS (.dmg)
npm run build:linux   # ← Linux (.AppImage + .deb + .rpm)
npm run build:all     # ← الكل معاً
```

**المخرجات**: `electron/dist-electron/`

---

## 📱 تطبيق Android (Capacitor)

### المتطلبات
- [Android Studio](https://developer.android.com/studio) مع Android SDK
- Java Development Kit (JDK 17+)

### إعداد المشروع (مرة واحدة)
```bash
cd app/frontend
node ../../build.mjs --android   # يبني الويب ثم يضيف Android

# أو يدوياً:
pnpm run build
npx cap add android
npx cap sync android
```

### فتح في Android Studio
```bash
cd app/frontend
npx cap open android
```

### بناء APK/AAB للنشر
في Android Studio:
- `Build → Generate Signed Bundle/APK`
- أو استخدم Gradle:
```bash
cd android
./gradlew assembleRelease    # APK
./gradlew bundleRelease      # AAB (Google Play)
```

---

## 🔄 سكريبت البناء الشامل

```bash
# من المجلد الجذري:
node build.mjs --all          # بناء الويب + Electron + Android
node build.mjs --electron     # بناء الويب + Electron فقط
node build.mjs --android      # بناء الويب + Android فقط
node build.mjs                # بناء الويب فقط
```

---

## ⚙️ متغيرات البيئة

```bash
# app/frontend/.env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SITE_URL=https://flavorexperts.net
```

---

## 📋 ملاحظات مهمة

- تطبيق Android يتصل بـ `https://flavorexperts.net` تلقائياً
- تطبيق Electron في وضع التطوير يتصل بـ `http://localhost:3001`
- تطبيق Electron في الإنتاج يعمل offline مع الملفات المنسوخة
- جميع التطبيقات تشترك في نفس كود React
