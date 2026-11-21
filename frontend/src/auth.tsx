import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { EntityId } from "@/ids";
import {
  readWorkspaceSession,
  writeWorkspaceSession,
  WORKSPACE_SESSION_EVENT,
  WORKSPACE_SESSION_KEY,
  type WorkspaceSession,
} from "@/session";
import { authTokenStore, TOKEN_KEY } from "@/utils/auth-token.util";
import { hasPersistedRaw } from "@/persist-auth";

export type Role = "SUPER_ADMIN" | "ADMIN" | "STAFF" | "STYLIST";

export type Organization = {
  orgId: EntityId;
  name: string;
  businessType: string;
  businessCategory: string;
  outletCount: number;
  createdAt: string;
  plan: string;
  profile: Record<string, string>;
  address: Record<string, string>;
  outlet: Record<string, string>;
  hours: DayHours[];
  slots: SlotConfig;
  services: OrgService[];
  staff: OrgStaff[];
  features: string[];
  menu: { mode: string; items: { name: string; category: string; price: string }[] };
  loyalty: Record<string, string>;
  reward: Record<string, string>;
  completed: string[];
};

export type DayHours = { day: string; open: boolean; from: string; to: string };
export type SlotConfig = {
  duration: string;
  buffer: string;
  maxPerSlot: string;
  advanceDays: string;
  minNotice: string;
  onlineBooking: boolean;
};
export type OrgService = {
  id: EntityId;
  orgId: EntityId;
  name: string;
  category: string;
  description: string;
  duration: string;
  price: string;
  discountPrice: string;
  status: string;
  staff: string;
};
export type OrgStaff = {
  id: EntityId;
  orgId: EntityId;
  name: string;
  phone: string;
  email: string;
  role: Role;
  services: string;
  workingHours: string;
  status: string;
};

export type SessionUser = {
  id: EntityId;
  orgId: EntityId | null;
  name: string;
  email: string;
  phone: string;
  role: Role;
  language?: string;
  staffId?: EntityId;
  locationId?: EntityId;
};

function withStaffLink(user: SessionUser): SessionUser {
  if (user.role !== "STYLIST") return user;
  return user;
}

export function getStoredSession(): SessionUser | null {
  const session = readWorkspaceSession();
  return session ? withStaffLink(session as SessionUser) : null;
}

export const DEFAULT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const defaultHours = (): DayHours[] =>
  DEFAULT_DAYS.map((day) => ({ day, open: day !== "Sunday", from: "09:00", to: "20:00" }));

export const defaultSlots = (): SlotConfig => ({
  duration: "30",
  buffer: "10",
  maxPerSlot: "1",
  advanceDays: "30",
  minNotice: "2",
  onlineBooking: true,
});

export function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateSlots(hours: DayHours[], duration: number, buffer: number) {
  const day = hours.find((h) => h.open);
  if (!day || duration <= 0) return [] as string[];
  const [fh, fm] = day.from.split(":").map(Number);
  const [th, tm] = day.to.split(":").map(Number);
  const start = (fh ?? 0) * 60 + (fm ?? 0);
  const end = (th ?? 0) * 60 + (tm ?? 0);
  const out: string[] = [];
  for (let t = start; t + duration <= end && out.length < 60; t += duration + buffer) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return out;
}

type Ctx = {
  orgs: Organization[];
  user: SessionUser | null;
  org: Organization | null;
  signIn: (
    email: string,
    role: Role,
    profile?: Partial<Pick<SessionUser, "id" | "name" | "phone" | "orgId" | "staffId" | "locationId" | "language">>,
  ) => SessionUser;
  patchUser: (partial: Partial<SessionUser>) => void;
  signOut: () => void;
  completeOnboarding: (org: Organization, admin: Omit<SessionUser, "id" | "orgId" | "role">) => void;
  toggleChecklist: (key: string) => void;
};

const AuthContext = createContext<Ctx | null>(null);

function persistUser(next: SessionUser | null) {
  writeWorkspaceSession(next as WorkspaceSession | null);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [user, setUser] = useState<SessionUser | null>(() => getStoredSession());

  useEffect(() => {
    const applyStored = (allowClear: boolean) => {
      const next = getStoredSession();
      setUser((prev) => {
        if (next) return withStaffLink(next);
        if (!allowClear && prev && (hasPersistedRaw(WORKSPACE_SESSION_KEY) || authTokenStore.getAccessToken())) {
          return prev;
        }
        return null;
      });
    };
    const onSessionEvent = () => applyStored(true);
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === WORKSPACE_SESSION_KEY || event.key === TOKEN_KEY) {
        applyStored(true);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") applyStored(false);
    };
    window.addEventListener(WORKSPACE_SESSION_EVENT, onSessionEvent);
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(WORKSPACE_SESSION_EVENT, onSessionEvent);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const signIn = useCallback(
    (email: string, role: Role, profile?: Partial<Pick<SessionUser, "id" | "name" | "phone" | "orgId" | "staffId" | "locationId" | "language">>) => {
      const next = withStaffLink({
        id: profile?.id ?? 0,
        orgId: profile?.orgId !== undefined ? profile.orgId : role === "SUPER_ADMIN" ? null : null,
        name: profile?.name || email.split("@")[0] || "User",
        email,
        phone: profile?.phone ?? "",
        role,
        language: profile?.language,
        staffId: profile?.staffId,
        locationId: profile?.locationId,
      });
      setUser(next);
      persistUser(next);
      return next;
    },
    [],
  );

  const patchUser = useCallback((partial: Partial<SessionUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      persistUser(next);
      return next;
    });
  }, []);

  const signOut = useCallback(() => {
    authTokenStore.clear();
    persistUser(null);
    setUser(null);
  }, []);

  const completeOnboarding = useCallback<Ctx["completeOnboarding"]>((org, admin) => {
    setOrgs((prev) => [org, ...prev.filter((o) => o.orgId !== org.orgId)]);
    const session: SessionUser = { id: 0, orgId: org.orgId, role: "ADMIN", ...admin };
    setUser(session);
    persistUser(session);
  }, []);

  const toggleChecklist = useCallback(
    (key: string) => {
      setOrgs((prev) =>
        prev.map((o) =>
          o.orgId === user?.orgId
            ? { ...o, completed: o.completed.includes(key) ? o.completed.filter((k) => k !== key) : [...o.completed, key] }
            : o,
        ),
      );
    },
    [user?.orgId],
  );

  const org = useMemo(() => orgs.find((o) => o.orgId === user?.orgId) ?? null, [orgs, user]);

  const value = useMemo<Ctx>(
    () => ({ orgs, user, org, signIn, patchUser, signOut, completeOnboarding, toggleChecklist }),
    [orgs, user, org, signIn, patchUser, signOut, completeOnboarding, toggleChecklist],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const ROLE_NAV: Record<Role, string[] | "all"> = {
  SUPER_ADMIN: "all",
  ADMIN: "all",
  STAFF: [
    "/dashboard",
    "/front-desk",
    "/customers",
    "/appointments",
    "/pos",
    "/invoices",
    "/walk-in",
    "/services",
    "/feedback",
    "/memberships",
    "/growth",
    "/loyalty",
    "/offers",
    "/coupons",
    "/prize-wheel",
    "/campaigns",
    "/inventory",
    "/vendors",
    "/reports",
    "/setup",
  ],
  STYLIST: [
    "/dashboard",
    "/front-desk",
    "/appointments",
    "/customers",
    "/services",
    "/feedback",
    "/shifts",
    "/attendance",
    "/leaves",
    "/commissions",
  ],
};
