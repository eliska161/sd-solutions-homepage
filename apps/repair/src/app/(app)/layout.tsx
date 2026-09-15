import { Suspense } from "react";
import { requireSession } from "@/lib/session";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export const dynamic = "force-dynamic";

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
        <Suspense fallback={<div className="h-12 bg-[#23262e]" />}>
          <Topbar
            userName={session.user.name}
            userEmail={session.user.email}
            userRole={session.user.role}
          />
        </Suspense>
        <main className="flex-1 px-4 py-4 lg:px-5">{children}</main>
      </div>
    </div>
  );
}
