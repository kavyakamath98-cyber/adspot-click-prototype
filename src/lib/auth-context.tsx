/**
 * Mock authentication + role model for the prototype.
 * Everything is persisted in localStorage — no backend, no auth library.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Role = "admin" | "user";
export type CampaignPermission = "none" | "read" | "write";
export type AccountStructure = "single" | "separate";

export interface Member {
  id: string;
  accountId: string;
  email: string;
  password?: string;
  role: Role;
  status: "Invited" | "Active";
  addedAt: string;
  /** campaignId -> permission. Admins ignore this map. */
  permissions: Record<string, CampaignPermission>;
  inviteToken?: string;
}

export interface Account {
  id: string;
  email: string;
  structure: AccountStructure;
  createdAt: string;
}

interface AuthDB {
  accounts: Account[];
  members: Member[];
  session: { memberId: string } | null;
  resets: { token: string; memberId: string }[];
}

const KEY = "additv.auth.v1";
const nowIso = () => new Date().toISOString();
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

function seed(): AuthDB {
  const a1: Account = {
    id: "acc_demo",
    email: "advertiser@demo.com",
    structure: "single",
    createdAt: nowIso(),
  };
  const a2: Account = {
    id: "acc_additv",
    email: "admin@adittv.com",
    structure: "separate",
    createdAt: nowIso(),
  };
  return {
    accounts: [a1, a2],
    members: [
      {
        id: "mem_demo",
        accountId: a1.id,
        email: a1.email,
        password: "Demo@1234",
        role: "admin",
        status: "Active",
        addedAt: nowIso(),
        permissions: {},
      },
      {
        id: "mem_additv",
        accountId: a2.id,
        email: a2.email,
        password: "Admin@1234",
        role: "admin",
        status: "Active",
        addedAt: nowIso(),
        permissions: {},
      },
    ],
    session: null,
    resets: [],
  };
}

function load(): AuthDB {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as AuthDB;
    if (!parsed.accounts || !parsed.members) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

function save(db: AuthDB) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* ignore quota errors in the prototype */
  }
}

interface AuthApi {
  ready: boolean;
  account: Account | null;
  member: Member | null;
  members: Member[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** Only meaningful for accounts with separate roles. */
  hasTeam: boolean;
  signup: (input: {
    email: string;
    password: string;
    structure: AccountStructure;
  }) => { ok: true; structure: AccountStructure } | { ok: false; error: string };
  login: (
    email: string,
    password: string,
    remember: boolean,
  ) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  emailExists: (email: string) => boolean;
  requestReset: (email: string) => string; // returns a mock reset token
  resetPassword: (token: string, password: string) => { ok: boolean; error?: string };
  inviteMember: (input: {
    email: string;
    role: Role;
    permissions: Record<string, CampaignPermission>;
  }) => { ok: true; token: string } | { ok: false; error: string };
  removeMember: (id: string) => void;
  changeRole: (id: string, role: Role) => void;
  setPermissions: (id: string, permissions: Record<string, CampaignPermission>) => void;
  resendInvite: (id: string) => string;
  transferOwnership: (id: string) => void;
  permissionFor: (campaignId: string) => CampaignPermission;
  canRead: (campaignId: string) => boolean;
  canWrite: (campaignId: string) => boolean;
}

const Ctx = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<AuthDB>(() => seed());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDb(load());
    setReady(true);
  }, []);

  const commit = useCallback((next: AuthDB) => {
    setDb(next);
    save(next);
  }, []);

  const member = useMemo(
    () => db.members.find((m) => m.id === db.session?.memberId) ?? null,
    [db],
  );
  const account = useMemo(
    () => db.accounts.find((a) => a.id === member?.accountId) ?? null,
    [db, member],
  );
  const members = useMemo(
    () => (account ? db.members.filter((m) => m.accountId === account.id) : []),
    [db, account],
  );

  const emailExists = useCallback(
    (email: string) => db.members.some((m) => m.email.toLowerCase() === email.trim().toLowerCase()),
    [db],
  );

  const signup: AuthApi["signup"] = useCallback(
    ({ email, password, structure }) => {
      const e = email.trim().toLowerCase();
      if (db.members.some((m) => m.email.toLowerCase() === e))
        return { ok: false, error: "An account with this email already exists." };
      const acc: Account = { id: uid("acc"), email: e, structure, createdAt: nowIso() };
      const mem: Member = {
        id: uid("mem"),
        accountId: acc.id,
        email: e,
        password,
        role: "admin",
        status: "Active",
        addedAt: nowIso(),
        permissions: {},
      };
      commit({
        ...db,
        accounts: [...db.accounts, acc],
        members: [...db.members, mem],
        session: { memberId: mem.id },
      });
      return { ok: true, structure };
    },
    [db, commit],
  );

  const login: AuthApi["login"] = useCallback(
    (email, password) => {
      const e = email.trim().toLowerCase();
      const found = db.members.find(
        (m) => m.email.toLowerCase() === e && m.password === password,
      );
      if (!found) return { ok: false, error: "Incorrect email or password." };
      commit({ ...db, session: { memberId: found.id } });
      return { ok: true };
    },
    [db, commit],
  );

  const logout = useCallback(() => commit({ ...db, session: null }), [db, commit]);

  const requestReset = useCallback(
    (email: string) => {
      const e = email.trim().toLowerCase();
      const found = db.members.find((m) => m.email.toLowerCase() === e);
      const token = uid("rst");
      if (found) commit({ ...db, resets: [...db.resets, { token, memberId: found.id }] });
      return token;
    },
    [db, commit],
  );

  const resetPassword = useCallback(
    (token: string, password: string) => {
      const entry = db.resets.find((r) => r.token === token);
      if (!entry) return { ok: false, error: "This reset link is invalid or has expired." };
      commit({
        ...db,
        members: db.members.map((m) =>
          m.id === entry.memberId ? { ...m, password, status: "Active" as const } : m,
        ),
        resets: db.resets.filter((r) => r.token !== token),
      });
      return { ok: true };
    },
    [db, commit],
  );

  const inviteMember: AuthApi["inviteMember"] = useCallback(
    ({ email, role, permissions }) => {
      if (!account) return { ok: false, error: "No account." };
      const e = email.trim().toLowerCase();
      if (db.members.some((m) => m.accountId === account.id && m.email.toLowerCase() === e))
        return { ok: false, error: "This person is already on your team." };
      const token = uid("inv");
      const mem: Member = {
        id: uid("mem"),
        accountId: account.id,
        email: e,
        role,
        status: "Invited",
        addedAt: nowIso(),
        permissions,
        inviteToken: token,
      };
      commit({ ...db, members: [...db.members, mem] });
      return { ok: true, token };
    },
    [db, account, commit],
  );

  const removeMember = useCallback(
    (id: string) => commit({ ...db, members: db.members.filter((m) => m.id !== id) }),
    [db, commit],
  );

  const changeRole = useCallback(
    (id: string, role: Role) =>
      commit({ ...db, members: db.members.map((m) => (m.id === id ? { ...m, role } : m)) }),
    [db, commit],
  );

  const setPermissions = useCallback(
    (id: string, permissions: Record<string, CampaignPermission>) =>
      commit({
        ...db,
        members: db.members.map((m) => (m.id === id ? { ...m, permissions } : m)),
      }),
    [db, commit],
  );

  const resendInvite = useCallback(
    (id: string) => {
      const token = uid("inv");
      commit({
        ...db,
        members: db.members.map((m) => (m.id === id ? { ...m, inviteToken: token } : m)),
      });
      return token;
    },
    [db, commit],
  );

  const transferOwnership = useCallback(
    (id: string) => {
      if (!member) return;
      commit({
        ...db,
        members: db.members.map((m) =>
          m.id === id
            ? { ...m, role: "admin" as Role }
            : m.id === member.id
              ? { ...m, role: "user" as Role }
              : m,
        ),
      });
    },
    [db, member, commit],
  );

  const permissionFor = useCallback(
    (campaignId: string): CampaignPermission => {
      if (!member) return "none";
      if (member.role === "admin") return "write";
      return member.permissions[campaignId] ?? "none";
    },
    [member],
  );

  const value: AuthApi = {
    ready,
    account,
    member,
    members,
    isAuthenticated: !!member,
    isAdmin: member?.role === "admin",
    hasTeam: account?.structure === "separate",
    signup,
    login,
    logout,
    emailExists,
    requestReset,
    resetPassword,
    inviteMember,
    removeMember,
    changeRole,
    setPermissions,
    resendInvite,
    transferOwnership,
    permissionFor,
    canRead: (id) => permissionFor(id) !== "none",
    canWrite: (id) => permissionFor(id) === "write",
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const READ_ONLY_TOOLTIP =
  "You have read-only access to this campaign. Ask your admin for edit access.";
