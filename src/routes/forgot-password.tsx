import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, CopyLink, FieldError } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { isEmailValid } from "@/lib/password";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Additv" },
      {
        name: "description",
        content: "Request a password reset link for your Additv advertiser account.",
      },
      { property: "og:title", content: "Reset your password — Additv" },
      { property: "og:description", content: "Request a password reset link for Additv." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { requestReset } = useAuth();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [sentToken, setSentToken] = useState<string | null>(null);

  const emailError = touched && !isEmailValid(email) ? "Enter a valid email address." : "";

  if (sentToken) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return (
      <AuthShell
        title="Check your email"
        subtitle="If an account exists for this email, we've sent a reset link."
        footer={
          <Link to="/login" className="font-medium text-foreground underline">
            Back to sign in
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          This is a prototype, so no real email is sent. Use the link below to continue.
        </p>
        <CopyLink url={`${origin}/reset-password?token=${sentToken}`} />
        <Button asChild className="w-full">
          <Link to="/reset-password" search={{ token: sentToken }}>
            Open reset link
          </Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link to="/login" className="font-medium text-foreground underline">
          Back to sign in
        </Link>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!isEmailValid(email)) return;
          setSentToken(requestReset(email));
        }}
      >
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
        <Button type="submit" className="w-full">
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
