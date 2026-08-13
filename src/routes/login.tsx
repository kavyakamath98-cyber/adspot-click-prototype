import { SYSTEM_ADMIN_HOME, isSystemAdminEmail } from "@/config/systemAdmin";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, FieldError, PasswordInput } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { isEmailValid } from "@/lib/password";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Additv" },
      { name: "description", content: "Sign in to your Additv advertiser account to manage hyperlocal DOOH campaigns." },
      { property: "og:title", content: "Sign in — Additv" },
      { property: "og:description", content: "Sign in to manage your Additv ad campaigns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");

  const emailError = touched && !isEmailValid(email) ? "Enter a valid email address." : "";
  const pwError = touched && !password ? "Enter your password." : "";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isEmailValid(email) || !password) return;
    const res = login(email, password, remember);
    if (!res.ok) {
      setError("Incorrect email or password.");
      return;
    }
    navigate({ to: isSystemAdminEmail(email) ? SYSTEM_ADMIN_HOME : "/" });
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back. Manage your ad campaigns."
      footer={
        <>
          New to Additv?{" "}
          <Link to="/signup" className="font-medium text-foreground underline">
            Create an account
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
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="you@business.com"
          />
          <FieldError>{emailError}</FieldError>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              setError("");
            }}
          />
          <FieldError>{pwError}</FieldError>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm font-medium underline">
            Forgot password?
          </Link>
        </div>
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">Demo accounts</div>
        advertiser@demo.com / Demo@1234 (single role)
        <br />
        admin@adittv.com / Admin@1234 (admin + team)
      </div>
    </AuthShell>
  );
}
