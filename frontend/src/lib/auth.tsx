import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { EntityId } from "@/lib/ids";
import { authTokenStore } from "@/utils/auth-token.util";

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
  staffId?: EntityId;
  locationId?: EntityId;
};

function withStaffLink(user: SessionUser): SessionUser {
  if (user.role !== "STYLIST") return user;
  return user;
}

const SESSION_KEY = "salon-crm-session-v1";

export function getStoredSession(): SessionUser | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? withStaffLink(JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
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
    profile?: Partial<Pick<SessionUser, "id" | "name" | "phone" | "orgId" | "staffId" | "locationId">>,
  ) => SessionUser;
  signOut: () => void;
  completeOnboarding: (org: Organization, admin: Omit<SessionUser, "id" | "orgId" | "role">) => void;
  toggleChecklist: (key: string) => void;
};

const AuthContext = createContext<Ctx | null>(null);

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const session = read<SessionUser | null>(SESSION_KEY, null);
    setUser(session ? withStaffLink(session) : null);
  }, []);

  const signIn = useCallback(
    (email: string, role: Role, profile?: Partial<Pick<SessionUser, "id" | "name" | "phone" | "orgId" | "staffId" | "locationId">>) => {
      const next = withStaffLink({
        id: profile?.id ?? 0,
        orgId: profile?.orgId !== undefined ? profile.orgId : role === "SUPER_ADMIN" ? null : null,
        name: profile?.name || email.split("@")[0] || "User",
        email,
        phone: profile?.phone ?? "",
        role,
        staffId: profile?.staffId,
        locationId: profile?.locationId,
      });
      setUser(next);
      write(SESSION_KEY, next);
      return next;
    },
    [],
  );

  const signOut = useCallback(() => {
    setUser(null);
    write(SESSION_KEY, null);
    authTokenStore.clear();
  }, []);

  const completeOnboarding = useCallback<Ctx["completeOnboarding"]>((org, admin) => {
    setOrgs((prev) => [org, ...prev.filter((o) => o.orgId !== org.orgId)]);
    const session: SessionUser = { id: 0, orgId: org.orgId, role: "ADMIN", ...admin };
    setUser(session);
    write(SESSION_KEY, session);
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
    () => ({ orgs, user, org, signIn, signOut, completeOnboarding, toggleChecklist }),
    [orgs, user, org, signIn, signOut, completeOnboarding, toggleChecklist],
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
    "/walk-in",
    "/services",
    "/feedback",
    "/memberships",
    "/loyalty",
    "/offers",
    "/coupons",
    "/prize-wheel",
    "/scratch-card",
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
