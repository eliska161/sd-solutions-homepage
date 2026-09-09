import { Suspense } from "react";
import { requireSession } from "@/lib/session";
import { AppTabs } from "@/components/layout/AppTabs";
import { Topbar } from "@/components/layout/Topbar";

/** All authenticated pages need the DB at request time — never prerender at build. */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar
        userName={session.user.name}
        userEmail={session.user.email}
        userRole={session.user.role}
      />
      <Suspense fallback={<div className="h-12 border-b border-border bg-surface" />}>
        <AppTabs />
      </Suspense>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-6">
        {children}
      </main>
    </div>
  );
}
