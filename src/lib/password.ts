/** Shared password rules for signup and reset. */
export interface PasswordCheck {
  label: string;
  ok: boolean;
}

export function passwordChecks(pw: string): PasswordCheck[] {
  return [
    { label: "At least 8 characters", ok: pw.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(pw) },
    { label: "One lowercase letter", ok: /[a-z]/.test(pw) },
    { label: "One number", ok: /[0-9]/.test(pw) },
    { label: "One special character", ok: /[^A-Za-z0-9]/.test(pw) },
  ];
}

export function isPasswordValid(pw: string) {
  return passwordChecks(pw).every((c) => c.ok);
}

/** 0-4 strength score with a plain-language label. */
export function passwordStrength(pw: string) {
  const passed = passwordChecks(pw).filter((c) => c.ok).length;
  const bonus = pw.length >= 12 ? 1 : 0;
  const score = Math.min(4, Math.max(0, passed - 1 + bonus));
  const label = ["Very weak", "Weak", "Fair", "Good", "Strong"][score];
  return { score, label };
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmailValid = (e: string) => EMAIL_RE.test(e.trim());
