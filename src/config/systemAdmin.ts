/**
 * Platform moderator (system admin) configuration.
 * Any address on SYSTEM_ADMIN_DOMAIN is treated as a system admin, plus the
 * explicit allow-list below.
 */
export const SYSTEM_ADMIN_EMAILS = ["admin@adittv.com"];

export const SYSTEM_ADMIN_DOMAIN = "adittv.com";

export const SYSTEM_ADMIN_HOME = "/system-admin";

export function isSystemAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return (
    SYSTEM_ADMIN_EMAILS.includes(e) || e.endsWith(`@${SYSTEM_ADMIN_DOMAIN}`)
  );
}
