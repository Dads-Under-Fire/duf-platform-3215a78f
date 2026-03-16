import { User, LogOut, ChevronLeft, FileSearch } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

import dufLogo from "@/assets/dufplatform.png";
import commShield from "@/assets/communication_shield.png";
import commShieldSelected from "@/assets/communication_shield_selected.png";
import evidenceAnalyzer from "@/assets/evidence_analyzer.png";
import evidenceAnalyzerSelected from "@/assets/evidence_analyzer_selected.png";

const navItems = [
  {
    title: "Communication Shield",
    url: "/",
    icon: commShield,
    iconSelected: commShieldSelected,
  },
  {
    title: "Evidence Analyzer",
    url: "/evidence",
    icon: evidenceAnalyzer,
    iconSelected: evidenceAnalyzerSelected,
  },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src={dufLogo} alt="DUF Platform" className="h-6 shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={item.url}
                    end
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                    activeClassName="text-primary bg-sidebar-accent"
                  >
                    <img
                      src={isActive ? item.iconSelected : item.icon}
                      alt={item.title}
                      className="h-5 w-5 shrink-0"
                    />
                    {!collapsed && <span className="text-sm">{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-4 space-y-1">
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-md w-full transition-colors"
        >
          <ChevronLeft className={`h-5 w-5 shrink-0 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          {!collapsed && <span className="text-sm">Collapse</span>}
        </button>

        <NavLink
          to="/account"
          className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-md"
          activeClassName="text-primary"
        >
          <User className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="text-sm">Account Settings</span>}
        </NavLink>

        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-md w-full transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
