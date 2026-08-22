import { createFileRoute } from "@tanstack/react-router";

import { SignUpForm } from "@/features/auth/signUpForm";

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <main className="min-h-svh bg-[#F8F7F4]">
      <div className="flex min-h-svh items-center justify-center px-6 py-12 sm:px-10">
        <SignUpForm />
      </div>
    </main>
  );
}
