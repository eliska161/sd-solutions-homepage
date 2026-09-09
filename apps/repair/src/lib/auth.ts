import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/lib/db";
import * as schema from "@/db/schema";

/**
 * Better Auth instance. Requires DATABASE_URL at runtime.
 * Email/password enabled for internal staff; OAuth can be added later.
 */
export function createAuth() {
  return betterAuth({
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
