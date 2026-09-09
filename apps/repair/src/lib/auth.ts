import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/lib/db";
import * as schema from "@/db/schema";

/**
 * Better Auth instance backed by postgres.js + Drizzle.
 * `role` is an additional user field (ADMIN | TECHNICIAN | VIEWER).
 */
export function createAuth() {
  const baseURL =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3001";

  return betterAuth({
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "TECHNICIAN",
          input: false,
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

let authSingleton: Auth | null = null;

export function getAuth() {
  if (!authSingleton) {
    authSingleton = createAuth();
  }
  return authSingleton;
}

/** Convenience export for route handlers / scripts. */
export const auth = {
  get api() {
    return getAuth().api;
  },
  get handler() {
    return getAuth().handler;
  },
};
