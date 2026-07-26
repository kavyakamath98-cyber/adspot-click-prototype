import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Images,
  Plus,
  LogOut,
  Megaphone,
  ChevronRight,
  BarChart3,
  LineChart,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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

const REPORT_ITEMS = [
  { to: "/reports/performance", label: "Campaign Performance", icon: LineChart, exact: false },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { advertiser } = useApp();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const campaignsOpen = CAMPAIGN_ITEMS.some((i) => isActive(i.to, i.exact));
  const reportsOpen = REPORT_ITEMS.some((i) => isActive(i.to, i.exact));

  if (collapsed) {
    const flat = [
      ...CAMPAIGN_ITEMS,
      ...REPORT_ITEMS,
      { to: "/library", label: "Content Library", icon: Images, exact: false },
    ];
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link to="/" className="flex items-center gap-2 px-2 py-1.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <span className="text-sm font-bold">A</span>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {flat.map((n) => (
                  <SidebarMenuItem key={n.to}>
                    <SidebarMenuButton asChild isActive={isActive(n.to, n.exact)} tooltip={n.label}>
                      <Link to={n.to}>
                        <n.icon className="h-4 w-4" />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-1.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold">A</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Additv</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Campaigns */}
              <Collapsible defaultOpen={campaignsOpen} className="group/campaigns">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="justify-between">
                      <span className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4" />
                        Campaigns
                      </span>
                      <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/campaigns:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
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
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Reports */}
              <Collapsible defaultOpen={reportsOpen} className="group/reports">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="justify-between">
                      <span className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Reports
                      </span>
                      <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/reports:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {REPORT_ITEMS.map((n) => (
                        <SidebarMenuSubItem key={n.to}>
                          <SidebarMenuSubButton asChild isActive={isActive(n.to, n.exact)}>
                            <Link to={n.to} className="flex items-center gap-2">
                              <n.icon className="h-4 w-4" />
                              <span>{n.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Content Library — flat */}
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
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 rounded-md px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
            RK
          </div>
          <div className="min-w-0 flex-1 text-xs leading-tight">
            <div className="truncate font-semibold">{advertiser.name}</div>
            <div className="truncate text-muted-foreground">{advertiser.email}</div>
          </div>
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
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
