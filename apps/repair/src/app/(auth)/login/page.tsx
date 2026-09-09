import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-6 text-muted">
          Laster…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
