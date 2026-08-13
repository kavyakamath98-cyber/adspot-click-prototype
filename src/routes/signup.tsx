import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, FieldError, PasswordInput, PasswordMeter } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth, type AccountStructure } from "@/lib/auth-context";
import { isEmailValid, isPasswordValid } from "@/lib/password";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — Additv" },
      {
        name: "description",
        content:
          "Create an Additv advertiser account to book hyperlocal DOOH screens, upload creatives and run campaigns.",
      },
      { property: "og:title", content: "Create your account — Additv" },
      { property: "og:description", content: "Start advertising on hyperlocal screens with Additv." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

const STRUCTURES: { value: AccountStructure; label: string; helper: string }[] = [
  {
    value: "single",
    label: "Single role — I'm the admin and the only user",
    helper: "You'll have full access to everything; no team management needed.",
  },
  {
    value: "separate",
    label: "Separate admin and user roles",
    helper: "You'll be the admin and can invite team members and control what they can access.",
  },
];

function SignupPage() {
  const { signup, emailExists } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [structure, setStructure] = useState<AccountStructure | "">("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");

  const emailError = !email
    ? ""
    : !isEmailValid(email)
      ? "Enter a valid email address."
      : emailExists(email)
        ? "An account with this email already exists."
        : "";
  const pwError = password && !isPasswordValid(password) ? "Password doesn't meet all rules." : "";
  const confirmError = confirm && confirm !== password ? "Passwords don't match." : "";

  const valid =
    isEmailValid(email) &&
    !emailExists(email) &&
    isPasswordValid(password) &&
    confirm === password &&
    !!structure &&
    terms;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !structure) return;
    const res = signup({ email, password, structure });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    navigate({ to: structure === "separate" ? "/settings/team" : "/" });
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up your advertiser account in a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-foreground underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
          />
          <FieldError>{emailError}</FieldError>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
          />
          <PasswordMeter value={password} />
          <FieldError>{pwError}</FieldError>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={confirm}
            onChange={setConfirm}
          />
          <FieldError>{confirmError}</FieldError>
        </div>

        <div className="space-y-2">
          <Label>Account structure</Label>
          <RadioGroup
            value={structure}
            onValueChange={(v) => setStructure(v as AccountStructure)}
            className="gap-2"
          >
            {STRUCTURES.map((s) => (
              <label
                key={s.value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                  structure === s.value ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                )}
              >
                <RadioGroupItem value={s.value} className="mt-0.5" />
                <span className="text-sm">
                  <span className="font-medium">{s.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{s.helper}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <Checkbox
            checked={terms}
            onCheckedChange={(v) => setTerms(!!v)}
            className="mt-0.5"
          />
          <span>
            I agree to the Terms &amp; Conditions and the Privacy Policy.
          </span>
        </label>

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={!valid}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
