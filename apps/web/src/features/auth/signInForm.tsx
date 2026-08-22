import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm() {
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <div className="w-full max-w-[420px]">
      {/* Heading */}
      <div className="mb-9 text-center">
        <h1 className="font-serif text-[34px] font-semibold leading-tight tracking-tight text-[#0F2744]">
          Welcome back
        </h1>

        <p className="mt-2 text-sm text-[#526984]">
          Sign in to continue your journey
        </p>
      </div>

      {/* Profile placeholder */}
      <div className="mb-9 flex justify-center">
        <div className="relative">
          <Avatar className="size-[86px] border-2 border-dashed border-[#C9D5E3] bg-white">
            <AvatarFallback className="bg-white text-[#4A3278]">
              <svg
                viewBox="0 0 24 24"
                className="size-8"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
              </svg>
            </AvatarFallback>
          </Avatar>

          {/* Plus button */}
          <span
            className="absolute bottom-0 right-0 flex size-7 translate-x-1/4 translate-y-1/4 items-center justify-center rounded-full bg-[#0D7A8A] text-white shadow-sm"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>

          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-[#526984]">
            Add Photo
          </span>
        </div>
      </div>

      {/* Form */}
      <form className="space-y-5">
        {/* Email */}
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-[11px] font-semibold uppercase tracking-[0.02em] text-[#344D68]"
          >
            Email
          </Label>

          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            className="h-11 rounded-lg border-[#D9E1EA] bg-white px-4 text-sm shadow-none placeholder:text-[#9AA9BA] focus-visible:border-[#0D7A8A] focus-visible:ring-[#0D7A8A]/20"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-[11px] font-semibold uppercase tracking-[0.02em] text-[#344D68]"
          >
            Password
          </Label>

          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            className="h-11 rounded-lg border-[#D9E1EA] bg-white px-4 text-sm shadow-none placeholder:text-[#9AA9BA] focus-visible:border-[#0D7A8A] focus-visible:ring-[#0D7A8A]/20"
          />
        </div>

        {/* Remember + Forgot */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) =>
                setRememberMe(checked === true)
              }
            />

            <Label
              htmlFor="remember-me"
              className="cursor-pointer text-xs font-normal text-[#344D68]"
            >
              Remember me
            </Label>
          </div>

          <button
            type="button"
            className="text-xs font-semibold text-[#0D7A8A] transition-colors hover:text-[#0F2744]"
          >
            Forgot password?
          </button>
        </div>

        {/* Sign in */}
        <Button
          type="submit"
          className="h-11 w-full rounded-lg bg-[#0F2744] text-sm font-semibold text-white shadow-none transition-colors hover:bg-[#183A61]"
        >
          Sign In
        </Button>

        {/* Signup */}
        <p className="pt-1 text-center text-sm text-[#526984]">
          New here?{" "}
          <button
            type="button"
            className="font-semibold text-[#0D7A8A] transition-colors hover:text-[#0F2744]"
          >
            Create an account
          </button>
        </p>
      </form>
    </div>
  );
}
