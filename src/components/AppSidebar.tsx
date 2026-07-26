import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Images, Plus, LogOut, Megaphone, ChevronRight } from "lucide-react";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";

const CAMPAIGN_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/campaigns/new", label: "Create Campaign", icon: Plus, exact: false },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { advertiser } = useApp();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const campaignsOpen = CAMPAIGN_ITEMS.some((i) => isActive(i.to, i.exact));

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
        {collapsed ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {CAMPAIGN_ITEMS.map((n) => (
                  <SidebarMenuItem key={n.to}>
                    <SidebarMenuButton asChild isActive={isActive(n.to, n.exact)} tooltip={n.label}>
                      <Link to={n.to} className="flex items-center gap-2">
                        <n.icon className="h-4 w-4" />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/library")} tooltip="Content Library">
                    <Link to="/library" className="flex items-center gap-2">
                      <Images className="h-4 w-4" />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            <Collapsible defaultOpen={campaignsOpen} className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center justify-between hover:text-foreground">
                    <span className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4" />
                      Campaigns
                    </span>
                    <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {CAMPAIGN_ITEMS.map((n) => (
                        <SidebarMenuSubItem key={n.to}>
                          <SidebarMenuSubButton asChild isActive={isActive(n.to, n.exact)}>
                            <Link to={n.to} className="flex items-center gap-2">
                              <n.icon className="h-4 w-4" />
                              <span>{n.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            <SidebarGroup>
              <SidebarGroupLabel>Library</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/library")}>
                      <Link to="/library" className="flex items-center gap-2">
                        <Images className="h-4 w-4" />
                        <span>Content Library</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
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
