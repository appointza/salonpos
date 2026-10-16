export const APP_LANGUAGES = ["en", "ta", "hi"] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const LANGUAGE_OPTIONS: { value: AppLanguage; label: string; native: string }[] = [
  { value: "en", label: "English", native: "English" },
  { value: "ta", label: "Tamil", native: "தமிழ்" },
  { value: "hi", label: "Hindi", native: "हिन्दी" },
];

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "en" || value === "ta" || value === "hi";
}

export function htmlLang(lang: AppLanguage) {
  return lang;
}
