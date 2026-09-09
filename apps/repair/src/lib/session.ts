import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema";
import type { UserRole } from "@/lib/permissions";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  image?: string | null;
};

export type AppSession = {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
  };
  user: SessionUser;
};

function asRole(value: unknown): UserRole {
  if (value === "ADMIN" || value === "TECHNICIAN" || value === "VIEWER") {
    return value;
  }
  return "TECHNICIAN";
}

export async function getSession(): Promise<AppSession | null> {
  const auth = getAuth();
  const raw = await auth.api.getSession({
    headers: await headers(),
  });
  if (!raw?.user?.id || !raw.session) return null;

  const roleFromSession = (raw.user as { role?: unknown }).role;
  let role = asRole(roleFromSession);

  if (!roleFromSession) {
    const db = getDb();
    const [row] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, raw.user.id))
      .limit(1);
    if (row) role = asRole(row.role);
  }

  return {
    session: {
      id: raw.session.id,
      userId: raw.session.userId,
      expiresAt: new Date(raw.session.expiresAt),
      token: raw.session.token,
    },
    user: {
      id: raw.user.id,
      name: raw.user.name,
      email: raw.user.email,
      image: raw.user.image,
      role,
    },
  };
}

export async function requireSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(roles: UserRole[]): Promise<AppSession> {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    throw new Error("Ingen tilgang for din rolle");
  }
  return session;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session?.user ?? null;
}
