export type UserRole = "ADMIN" | "TECHNICIAN" | "VIEWER";

const writeRoles: UserRole[] = ["ADMIN", "TECHNICIAN"];

export function canWrite(role: UserRole): boolean {
  return writeRoles.includes(role);
}

export function canAdmin(role: UserRole): boolean {
  return role === "ADMIN";
}

export function assertCanWrite(role: UserRole) {
  if (!canWrite(role)) {
    throw new Error("Forbidden: read-only role");
  }
}
