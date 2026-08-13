import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyLink, FieldError } from "@/components/AuthShell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import {
  useAuth,
  type CampaignPermission,
  type Member,
  type Role,
} from "@/lib/auth-context";
import { isEmailValid } from "@/lib/password";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/team")({
  head: () => ({
    meta: [
      { title: "Team Management — Additv" },
      {
        name: "description",
        content:
          "Invite teammates, set their role and control which campaigns they can view or edit in Additv.",
      },
      { property: "og:title", content: "Team Management — Additv" },
      {
        property: "og:description",
        content: "Invite teammates and control per-campaign access in Additv.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamManagementPage,
});

const PERMS: { value: CampaignPermission; label: string }[] = [
  { value: "none", label: "No access" },
  { value: "read", label: "Read only" },
  { value: "write", label: "Read & write" },
];

function inviteUrl(token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/signup?invite=${token}`;
}

function PermissionMatrix({
  campaigns,
  value,
  onChange,
}: {
  campaigns: { id: string; name: string }[];
  value: Record<string, CampaignPermission>;
  onChange: (v: Record<string, CampaignPermission>) => void;
}) {
  const applyAll = (p: CampaignPermission) =>
    onChange(Object.fromEntries(campaigns.map((c) => [c.id, p])));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Apply to all campaigns:</span>
        {PERMS.map((p) => (
          <Button key={p.value} type="button" size="sm" variant="outline" onClick={() => applyAll(p.value)}>
            {p.label}
          </Button>
        ))}
      </div>
      <div className="max-h-64 overflow-y-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/60">
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Campaign</th>
              {PERMS.map((p) => (
                <th key={p.value} className="px-3 py-2 text-center font-medium">
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  No campaigns yet.
                </td>
              </tr>
            )}
            {campaigns.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2">{c.name}</td>
                {PERMS.map((p) => (
                  <td key={p.value} className="px-3 py-2 text-center">
                    <input
                      type="radio"
                      name={`perm-${c.id}`}
                      className="h-4 w-4 accent-[#3baa3b]"
                      checked={(value[c.id] ?? "none") === p.value}
                      onChange={() => onChange({ ...value, [c.id]: p.value })}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamManagementPage() {
  const { campaigns } = useApp();
  const {
    isAdmin,
    member,
    members,
    inviteMember,
    removeMember,
    changeRole,
    setPermissions,
    resendInvite,
    transferOwnership,
  } = useAuth();

  const campaignList = useMemo(
    () => campaigns.map((c) => ({ id: c.id, name: c.name })),
    [campaigns],
  );

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [perms, setPerms] = useState<Record<string, CampaignPermission>>({});
  const [inviteError, setInviteError] = useState("");
  const [lastInvite, setLastInvite] = useState<{ email: string; token: string } | null>(null);

  const [editing, setEditing] = useState<Member | null>(null);
  const [editPerms, setEditPerms] = useState<Record<string, CampaignPermission>>({});
  const [removing, setRemoving] = useState<Member | null>(null);

  if (!isAdmin) {
    return (
      <AppShell title="Team Management">
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Only admins can manage team members.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const accessCount = (m: Member) =>
    m.role === "admin"
      ? campaignList.length
      : Object.values(m.permissions).filter((p) => p !== "none").length;

  const others = members.filter((m) => m.id !== member?.id);

  return (
    <AppShell title="Team Management">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold">Team members</h2>
        <span className="text-sm text-muted-foreground">
          Invite people and choose exactly which campaigns they can see or edit.
        </span>
        <Button
          className="ml-auto"
          onClick={() => {
            setEmail("");
            setRole("user");
            setPerms({});
            setInviteError("");
            setInviteOpen(true);
          }}
        >
          <UserPlus className="mr-2 h-4 w-4" /> Invite user
        </Button>
      </div>

      {lastInvite && (
        <Card className="mb-6 border-primary/40 bg-primary/5">
          <CardContent className="space-y-2 py-4">
            <div className="text-sm font-medium">
              Invite created for {lastInvite.email}
            </div>
            <p className="text-xs text-muted-foreground">
              Emails aren't sent in this prototype — share this link instead.
            </p>
            <CopyLink url={inviteUrl(lastInvite.token)} label="Copy invite link" />
          </CardContent>
        </Card>
      )}

      {others.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <div>
              <div className="font-medium">No team members yet</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Invite your first user to give them access to specific campaigns.
              </p>
            </div>
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Invite your first user
            </Button>
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardContent className="overflow-x-auto py-4">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Campaigns</th>
                <th className="py-2 pr-3 font-medium">Date added</th>
                <th className="py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    {m.email}
                    {m.id === member?.id && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 capitalize">{m.role}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        m.status === "Active"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
                      )}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{accessCount(m)}</td>
                  <td className="py-2 pr-3">
                    {new Date(m.addedAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-2 text-right">
                    {m.id === member?.id ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditing(m);
                              setEditPerms(m.permissions);
                            }}
                          >
                            Edit permissions
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              changeRole(m.id, m.role === "admin" ? "user" : "admin");
                              toast.success(
                                `${m.email} is now ${m.role === "admin" ? "a user" : "an admin"}.`,
                              );
                            }}
                          >
                            Change role to {m.role === "admin" ? "User" : "Admin"}
                          </DropdownMenuItem>
                          {m.status === "Invited" && (
                            <DropdownMenuItem
                              onSelect={() => {
                                const token = resendInvite(m.id);
                                setLastInvite({ email: m.email, token });
                                toast.success("Invite regenerated.");
                              }}
                            >
                              Resend invite
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onSelect={() => {
                              transferOwnership(m.id);
                              toast.success(`Admin ownership transferred to ${m.email}.`);
                            }}
                          >
                            Transfer admin ownership
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => setRemoving(m)}
                          >
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      )}

      {/* Invite modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
            <DialogDescription>
              They'll get access only to the campaigns you allow below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setInviteError("");
                  }}
                  placeholder="teammate@business.com"
                />
                <FieldError>{inviteError}</FieldError>
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {role === "admin" ? (
              <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                Admins get full read &amp; write access to every campaign, plus team and
                wallet management.
              </p>
            ) : (
              <PermissionMatrix campaigns={campaignList} value={perms} onChange={setPerms} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!isEmailValid(email)) {
                  setInviteError("Enter a valid email address.");
                  return;
                }
                const res = inviteMember({
                  email,
                  role,
                  permissions: role === "admin" ? {} : perms,
                });
                if (!res.ok) {
                  setInviteError(res.error);
                  return;
                }
                setLastInvite({ email: email.trim().toLowerCase(), token: res.token });
                setInviteOpen(false);
                toast.success("Invite created.");
              }}
            >
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit permissions */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit permissions</DialogTitle>
            <DialogDescription>{editing?.email}</DialogDescription>
          </DialogHeader>
          {editing?.role === "admin" ? (
            <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              Admins always have full access to every campaign.
            </p>
          ) : (
            <PermissionMatrix
              campaigns={campaignList}
              value={editPerms}
              onChange={setEditPerms}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editing) setPermissions(editing.id, editPerms);
                setEditing(null);
                toast.success("Permissions updated.");
              }}
            >
              Save permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll lose access to all campaigns immediately. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing) removeMember(removing.id);
                setRemoving(null);
                toast.success("Member removed.");
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
