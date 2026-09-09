import { Suspense } from "react";
import { requireSession } from "@/lib/session";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <p className="text-[13px] text-muted">repair.sd-solutions.org</p>
          <Suspense fallback={null}>
            <p className="text-[13px] text-muted">
              {session.user.name} · {session.user.role}
            </p>
          </Suspense>
        </header>
        <main className="flex-1 overflow-auto px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
