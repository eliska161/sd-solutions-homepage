import { PageHeader } from "@/components/layout/PageHeader";
import { requireSession } from "@/lib/session";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const session = await requireSession();

  return (
    <div>
      <PageHeader
        title="Min profil"
        description="Endre navn, e-post og passord for innlogget bruker."
      />
      <ProfileForm
        initialName={session.user.name}
        initialEmail={session.user.email}
        role={session.user.role}
      />
    </div>
  );
}
