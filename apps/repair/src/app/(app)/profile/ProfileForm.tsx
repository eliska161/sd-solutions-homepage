"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { changeMyPassword, updateMyProfile } from "@/server/profile";

export function ProfileForm({
  initialName,
  initialEmail,
  role,
}: {
  initialName: string;
  initialEmail: string;
  role: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className="space-y-4 rounded-xl border border-border bg-surface p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setMsg(null);
          startTransition(async () => {
            try {
              await updateMyProfile({ name, email });
              setMsg("Profil lagret.");
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Kunne ikke lagre");
            }
          });
        }}
      >
        <div>
          <p className="text-sm font-medium">Profil</p>
          <p className="mt-1 text-[12px] text-muted">Rolle: {role}</p>
        </div>
        <div>
          <Label htmlFor="profileName">Navn</Label>
          <Input
            id="profileName"
            className="mt-1.5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="profileEmail">E-post</Label>
          <Input
            id="profileEmail"
            type="email"
            className="mt-1.5"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {msg ? <p className="text-sm text-success">{msg}</p> : null}
        <Button type="submit" disabled={pending}>
          Lagre profil
        </Button>
      </form>

      <form
        className="space-y-4 rounded-xl border border-border bg-surface p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setPwError(null);
          setPwMsg(null);
          startTransition(async () => {
            try {
              await changeMyPassword({
                currentPassword,
                newPassword,
                confirmPassword,
              });
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setPwMsg("Passord endret.");
            } catch (err) {
              setPwError(
                err instanceof Error ? err.message : "Kunne ikke endre passord",
              );
            }
          });
        }}
      >
        <p className="text-sm font-medium">Bytt passord</p>
        <div>
          <Label htmlFor="currentPassword">Nåværende passord</Label>
          <Input
            id="currentPassword"
            type="password"
            className="mt-1.5"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <div>
          <Label htmlFor="newPassword">Nytt passord</Label>
          <Input
            id="newPassword"
            type="password"
            className="mt-1.5"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div>
          <Label htmlFor="confirmPassword">Bekreft nytt passord</Label>
          <Input
            id="confirmPassword"
            type="password"
            className="mt-1.5"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        {pwError ? <p className="text-sm text-danger">{pwError}</p> : null}
        {pwMsg ? <p className="text-sm text-success">{pwMsg}</p> : null}
        <Button type="submit" variant="secondary" disabled={pending}>
          Endre passord
        </Button>
      </form>
    </div>
  );
}
