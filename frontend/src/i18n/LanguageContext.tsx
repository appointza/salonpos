import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { htmlLang, isAppLanguage, type AppLanguage } from "@/i18n/languages";
import { lookupMessage } from "@/i18n/messages";
import { authService } from "@/services/auth.service";

const GLOBAL_KEY = "krios-ui-lang";
const userKey = (id: string | number) => `krios-ui-lang:u:${id}`;

function readStored(userId?: string | number | null): AppLanguage {
  try {
    if (userId != null && String(userId) !== "") {
      const perUser = window.localStorage.getItem(userKey(userId));
      if (isAppLanguage(perUser)) return perUser;
    }
    const global = window.localStorage.getItem(GLOBAL_KEY);
    if (isAppLanguage(global)) return global;
  } catch {
    /* ignore */
  }
  return "en";
}

function writeStored(lang: AppLanguage, userId?: string | number | null) {
  try {
    window.localStorage.setItem(GLOBAL_KEY, lang);
    if (userId != null && String(userId) !== "") {
      window.localStorage.setItem(userKey(userId), lang);
    }
  } catch {
    /* ignore */
  }
}

type LanguageCtx = {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, patchUser } = useAuth();
  const userId = user?.id;
  const [language, setLanguageState] = useState<AppLanguage>("en");

  useEffect(() => {
    if (isAppLanguage(user?.language)) {
      setLanguageState(user.language);
      writeStored(user.language, userId);
      return;
    }
    setLanguageState(readStored(userId));
  }, [userId, user?.language]);

  useEffect(() => {
    document.documentElement.lang = htmlLang(language);
  }, [language]);

  const setLanguage = useCallback(
    (lang: AppLanguage) => {
      setLanguageState(lang);
      writeStored(lang, userId);
      patchUser({ language: lang });
      const id = Number(userId);
      if (id > 0) {
        void authService.updateLanguage({ userId: id, language: lang }).catch(() => undefined);
      }
    },
    [userId, patchUser],
  );

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => lookupMessage(language, key, vars),
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}

export function useT() {
  return useLanguage().t;
}
