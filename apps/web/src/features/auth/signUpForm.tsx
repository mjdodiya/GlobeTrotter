import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";

const countries = [
  "United States",
  "United Kingdom",
  "India",
  "Netherlands",
  "France",
  "Italy",
  "Japan",
  "Australia",
  "Canada",
  "Germany",
  "Spain",
  "Singapore",
];

export function SignUpForm() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError("Complete all required fields to create your account.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Your passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authClient.signUp.email({
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim(),
        password,
      });
      if (result.error) {
        setError(result.error.message || "We could not create your account.");
        setIsSubmitting(false);
        return;
      }
    } catch {
      setError("We could not reach the sign-up service. Try again.");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);

    await navigate({ to: "/" });
  }

  return (
    <div className="w-full max-w-[590px]">
      {/* Heading */}
      <div className="mb-7">
        <h1 className="font-heading text-[34px] font-semibold leading-tight tracking-tight text-[#0F2744]">
          Create your account
        </h1>

        <p className="mt-1 text-[13px] text-[#526984]">
          Fill in your details to start exploring
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {/* Profile photo card */}
        <Card className="rounded-2xl border-[#E1E5E8] bg-white shadow-[0_1px_3px_rgba(15,39,68,0.08)]">
          <CardContent className="flex items-center gap-5 px-5 py-5">
            <div className="relative shrink-0">
              <Avatar className="size-[78px] border-2 border-dashed border-[#C9D5E3] bg-white">
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

              <span
                className="absolute bottom-0 right-0 flex size-6 translate-x-1/4 translate-y-1/4 items-center justify-center rounded-full bg-[#0D7A8A] text-white"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </div>

            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold text-[#0F2744]">
                Profile Photo
              </h2>

              <p className="mt-1 text-[11px] leading-4 text-[#8092A8]">
                A clear photo helps your travel community recognize you
              </p>

              <button
                type="button"
                className="mt-2 text-[11px] font-semibold text-[#0D7A8A] hover:text-[#0F2744]"
              >
                Upload photo
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Personal information */}
        <Card className="rounded-2xl border-[#E1E5E8] bg-white shadow-[0_1px_3px_rgba(15,39,68,0.08)]">
          <CardContent className="space-y-4 px-6 py-6">
            {/* First + Last name */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="first-name"
                  className="text-[10px] font-semibold uppercase tracking-wide text-[#344D68]"
                >
                  First Name
                </Label>

                <Input
                  id="first-name"
                  placeholder="Alexandra"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  required
                  className="h-10 rounded-lg border-[#D9E1EA] bg-white text-[12px] placeholder:text-[#8FA1B6] focus-visible:border-[#0D7A8A] focus-visible:ring-[#0D7A8A]/20"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="last-name"
                  className="text-[10px] font-semibold uppercase tracking-wide text-[#344D68]"
                >
                  Last Name
                </Label>

                <Input
                  id="last-name"
                  placeholder="Smith"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                  required
                  className="h-10 rounded-lg border-[#D9E1EA] bg-white text-[12px] placeholder:text-[#8FA1B6] focus-visible:border-[#0D7A8A] focus-visible:ring-[#0D7A8A]/20"
                />
              </div>
            </div>

            {/* Email + phone */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-[10px] font-semibold uppercase tracking-wide text-[#344D68]"
                >
                  Email Address
                </Label>

                <Input
                  id="email"
                  type="email"
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  className="h-10 rounded-lg border-[#D9E1EA] bg-white text-[12px] placeholder:text-[#8FA1B6] focus-visible:border-[#0D7A8A] focus-visible:ring-[#0D7A8A]/20"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="phone"
                  className="text-[10px] font-semibold uppercase tracking-wide text-[#344D68]"
                >
                  Phone Number
                </Label>

                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  className="h-10 rounded-lg border-[#D9E1EA] bg-white text-[12px] placeholder:text-[#8FA1B6] focus-visible:border-[#0D7A8A] focus-visible:ring-[#0D7A8A]/20"
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-[10px] font-semibold uppercase tracking-wide text-[#344D68]"
                >
                  Password
                </Label>

                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  className="h-10 rounded-lg border-[#D9E1EA] bg-white text-[12px] placeholder:text-[#8FA1B6] focus-visible:border-[#0D7A8A] focus-visible:ring-[#0D7A8A]/20"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password-confirmation"
                  className="text-[10px] font-semibold uppercase tracking-wide text-[#344D68]"
                >
                  Confirm Password
                </Label>

                <Input
                  id="password-confirmation"
                  type="password"
                  placeholder="Re-enter your password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  autoComplete="new-password"
                  required
                  className="h-10 rounded-lg border-[#D9E1EA] bg-white text-[12px] placeholder:text-[#8FA1B6] focus-visible:border-[#0D7A8A] focus-visible:ring-[#0D7A8A]/20"
                />
              </div>
            </div>

            {/* City + country */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="city"
                  className="text-[10px] font-semibold uppercase tracking-wide text-[#344D68]"
                >
                  City
                </Label>

                <Input
                  id="city"
                  placeholder="New York"
                  className="h-10 rounded-lg border-[#D9E1EA] bg-white text-[12px] placeholder:text-[#8FA1B6] focus-visible:border-[#0D7A8A] focus-visible:ring-[#0D7A8A]/20"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="country"
                  className="text-[10px] font-semibold uppercase tracking-wide text-[#344D68]"
                >
                  Country
                </Label>

                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger
                    id="country"
                    className="h-10 w-full rounded-lg border-[#D9E1EA] bg-white text-[12px] text-[#526984] focus:border-[#0D7A8A] focus:ring-[#0D7A8A]/20"
                  >
                    <SelectValue placeholder="Select country..." />
                  </SelectTrigger>

                  <SelectContent>
                    {countries.map((countryName) => (
                      <SelectItem
                        key={countryName}
                        value={countryName.toLowerCase().replaceAll(" ", "-")}
                      >
                        {countryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional information */}
            <div className="space-y-2">
              <Label
                htmlFor="additional-information"
                className="text-[10px] font-semibold uppercase tracking-wide text-[#344D68]"
              >
                Additional Information
              </Label>

              <Textarea
                id="additional-information"
                placeholder="Tell us about your travel style, preferred activities, and interests..."
                className="min-h-[84px] resize-none rounded-lg border-[#D9E1EA] bg-white px-4 py-3 text-[12px] leading-5 placeholder:text-[#8FA1B6] focus-visible:border-[#0D7A8A] focus-visible:ring-[#0D7A8A]/20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Register */}
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-[46px] w-full rounded-lg bg-[#0F2744] text-[12px] font-semibold text-white shadow-none hover:bg-[#183A61]"
        >
          {isSubmitting ? "Creating account..." : "Register User"}
        </Button>

        {/* Sign in */}
        <p className="text-center text-[12px] text-[#526984]">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-[#0D7A8A] transition-colors hover:text-[#0F2744]"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
