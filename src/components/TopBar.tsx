import { useProfile } from "@/hooks/useProfile";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { format } from "date-fns";

export function TopBar() {
  const { profile } = useProfile();

  return (
    <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-background shrink-0">
      <div className="flex items-center gap-6">
        <SidebarTrigger className="md:hidden text-foreground" />
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <span className="text-primary font-bold text-lg">
              {profile?.message_rewrites_used ?? 0}
            </span>
            <span className="text-muted-foreground text-sm">
              / {profile?.message_rewrites_limit ?? 250}
            </span>
            <span className="text-muted-foreground text-xs ml-1">Message Rewrites</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-primary font-bold text-lg">
              {profile?.evidence_analyses_used ?? 0}
            </span>
            <span className="text-muted-foreground text-sm">
              / {profile?.evidence_analyses_limit ?? 25}
            </span>
            <span className="text-muted-foreground text-xs ml-1">Evidence Analyses</span>
          </div>
          <button className="text-primary text-sm hover:underline hidden sm:block">
            Add more credits
          </button>
        </div>
      </div>
      <span className="text-muted-foreground text-sm hidden sm:block">
        {format(new Date(), "MMMM d, yyyy h:mma")}
      </span>
    </div>
  );
}
