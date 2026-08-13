import { useState, type ReactNode } from "react";
import { Eye, EyeOff, Check, X, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { passwordChecks, passwordStrength } from "@/lib/password";
import { toast } from "sonner";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold">A</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Additv</span>
        </div>
        <Card>
          <CardContent className="py-6">
            <h1 className="text-xl font-semibold">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-5 space-y-4">{children}</div>
          </CardContent>
        </Card>
        {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}

export function PasswordInput({
  value,
  onChange,
  placeholder = "Password",
  id,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function PasswordMeter({ value }: { value: string }) {
  const { score, label } = passwordStrength(value);
  const checks = passwordChecks(value);
  if (!value) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex h-1.5 flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-full",
                i < score ? "bg-primary" : "bg-muted",
                score >= 4 && i < score && "bg-[#3baa3b]",
              )}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <ul className="grid gap-1 sm:grid-cols-2">
        {checks.map((c) => (
          <li
            key={c.label}
            className={cn(
              "flex items-center gap-1 text-[11px]",
              c.ok ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {c.ok ? (
              <Check className="h-3 w-3 text-[#3baa3b]" />
            ) : (
              <X className="h-3 w-3 opacity-60" />
            )}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="text-xs text-destructive">{children}</p>;
}

export function CopyLink({ url, label = "Copy link" }: { url: string; label?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
      <code className="min-w-0 flex-1 truncate text-xs">{url}</code>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          navigator.clipboard?.writeText(url);
          toast.success("Link copied");
        }}
      >
        <Copy className="mr-1 h-3.5 w-3.5" />
        {label}
      </Button>
    </div>
  );
}
