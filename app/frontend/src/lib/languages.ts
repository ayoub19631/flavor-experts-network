export const LANGUAGES = [
  { code: "en", name: "English", native: "English", dir: "ltr" },
  { code: "ar", name: "Arabic", native: "العربية", dir: "rtl" },
  { code: "fr", name: "French", native: "Français", dir: "ltr" },
  { code: "es", name: "Spanish", native: "Español", dir: "ltr" },
  { code: "de", name: "German", native: "Deutsch", dir: "ltr" },
  { code: "tr", name: "Turkish", native: "Türkçe", dir: "ltr" },
  { code: "zh", name: "Chinese", native: "中文", dir: "ltr" },
] as const;

export const PUBLIC_LANGUAGES = LANGUAGES.filter((item) => item.code === "en" || item.code === "ar");

export type Language = (typeof LANGUAGES)[number]["code"];

export function isLanguage(value: string | null | undefined): value is Language {
  return !!value && LANGUAGES.some((item) => item.code === value);
}

export function languageMeta(code: Language) {
  return LANGUAGES.find((item) => item.code === code) || LANGUAGES[0];
}

export function localeFor(code: Language): string {
  if (code === "zh") return "zh-CN";
  return code;
}

export function bilingualLang(code: Language): "ar" | "en" {
  return code === "ar" ? "ar" : "en";
}
