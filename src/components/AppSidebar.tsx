import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Images, Plus, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/library", label: "Content Library", icon: Images, exact: false },
  { to: "/campaigns/new", label: "Create Campaign", icon: Plus, exact: false, primary: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { advertiser } = useApp();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-1.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold">A</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold tracking-tight">Additv</span>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigate</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((n) => (
                <SidebarMenuItem key={n.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(n.to, n.exact)}
                    tooltip={n.label}
                  >
                    <Link to={n.to} className="flex items-center gap-2">
                      <n.icon className="h-4 w-4" />
                      {!collapsed && <span>{n.label}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 rounded-md px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
            RK
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 text-xs leading-tight">
              <div className="truncate font-semibold">{advertiser.name}</div>
              <div className="truncate text-muted-foreground">{advertiser.email}</div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() =>
                toast.info(
                  "Sign out is disabled in this prototype. You are always signed in as Ramesh's Kitchen.",
                )
              }
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
