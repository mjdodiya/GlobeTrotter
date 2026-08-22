import { createFileRoute } from "@tanstack/react-router";
import signinImage from "@/assets/images/signinImg.jpg";
import { SignInForm } from "@/features/auth/signInForm";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <main className="min-h-svh bg-[#F8F7F4]">
      <div className="grid min-h-svh lg:grid-cols-2">
        {/* Left side — travel image */}
        <section className="relative hidden overflow-hidden lg:block">
          <img
            src={signinImage}
            alt="Travel image"
            className="absolute inset-0 size-full object-cover"
          />

          {/* Image overlay */}
          <div className="absolute inset-0 bg-[#0F2744]/65" />

          <div className="relative z-10 flex min-h-svh flex-col justify-between p-10 xl:p-12">
            {/* Brand */}
            <div>
              <span className="font-serif text-2xl font-semibold text-white">
                GlobeTrotter
              </span>
            </div>

            {/* Main copy */}
            <div className="max-w-md">
              <h2 className="font-serif text-5xl font-semibold leading-[1.08] tracking-tight text-white xl:text-6xl">
                Your world,
                <br />
                perfectly planned.
              </h2>

              <p className="mt-5 max-w-md text-base leading-7 text-white/80">
                From weekend escapes to epic adventures — we plan it all.
              </p>
            </div>

            {/* Destination tags */}
            <div className="flex flex-wrap gap-2">
              {["Paris", "Tokyo", "Bali", "New York", "Rome"].map(
                (destination) => (
                  <span
                    key={destination}
                    className="rounded-full border border-white/30 bg-white/5 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
                  >
                    {destination}
                  </span>
                ),
              )}
            </div>
          </div>
        </section>

        {/* Right side — sign in */}
        <section className="flex min-h-svh items-center justify-center px-6 py-12 sm:px-10">
          <SignInForm />
        </section>
      </div>
    </main>
  );
}
