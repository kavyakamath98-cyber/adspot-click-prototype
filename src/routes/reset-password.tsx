import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, FieldError, PasswordInput, PasswordMeter } from "@/components/AuthShell";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { isPasswordValid } from "@/lib/password";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({
    meta: [
      { title: "Set a new password — Additv" },
      {
        name: "description",
        content: "Choose a new password for your Additv advertiser account.",
      },
      { property: "og:title", content: "Set a new password — Additv" },
      { property: "og:description", content: "Choose a new password for your Additv account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const pwError = password && !isPasswordValid(password) ? "Password doesn't meet all rules." : "";
  const confirmError = confirm && confirm !== password ? "Passwords don't match." : "";
  const valid = isPasswordValid(password) && confirm === password;

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You can now sign in with your new password.">
        <Button className="w-full" onClick={() => navigate({ to: "/login" })}>
          Go to sign in
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before."
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
          if (!valid) return;
          const res = resetPassword(token, password);
          if (!res.ok) {
            setError(res.error ?? "This reset link is invalid or has expired.");
            return;
          }
          setDone(true);
          setTimeout(() => navigate({ to: "/login" }), 1500);
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
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
          <Label htmlFor="confirm">Confirm new password</Label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={confirm}
            onChange={setConfirm}
          />
          <FieldError>{confirmError}</FieldError>
        </div>
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={!valid}>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
