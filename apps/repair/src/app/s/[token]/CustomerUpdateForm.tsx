"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { addPublicRepairUpdate } from "@/server/public-status";

export function CustomerUpdateForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await addPublicRepairUpdate(token, content);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setContent("");
    window.location.reload();
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        rows={3}
        placeholder="Skriv en melding til verkstedet…"
      />
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || content.trim().length < 2}>
        {pending ? "Sender…" : "Send"}
      </Button>
    </form>
  );
}
