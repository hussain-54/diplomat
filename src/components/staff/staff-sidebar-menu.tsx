import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { STAFF_SIDEBAR_ITEMS, isStaffNavActive } from "@/components/staff/nav";
import { getStaffLibraryCounts } from "@/lib/staff.functions";
import { hasPermission, type AppRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const EXPAND_KEY = "newsroom-staff-nav-expanded";

function initialExpanded() {
  if (typeof window === "undefined") return true;
  const saved = window.localStorage.getItem(EXPAND_KEY);
  if (saved === null) return true;
  return saved === "1";
}

export function StaffSidebarMenu({
  collapsed,
  roles,
}: {
  collapsed: boolean;
  roles: AppRole[] | string[];
}) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(initialExpanded);
  const inStaff = location.pathname.startsWith("/admin/staff");

  const countsQ = useQuery({
    queryKey: ["staff-library-counts"],
    queryFn: getStaffLibraryCounts,
    staleTime: 30_000,
    enabled: hasPermission(roles, "staff:manage"),
  });

  const items = useMemo(
    () => STAFF_SIDEBAR_ITEMS.filter((item) => hasPermission(roles, item.permission)),
    [roles],
  );
  const counts = countsQ.data ?? { all: 0, active: 0, invited: 0, suspended: 0 };

  useEffect(() => {
    window.localStorage.setItem(EXPAND_KEY, expanded ? "1" : "0");
  }, [expanded]);

  if (collapsed) {
    const link = (
      <Link
        to="/admin/staff"
        className={cn(
          "relative flex h-9 items-center justify-center rounded-lg cms-transition",
          inStaff
            ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--cms-glow),0_6px_16px_var(--cms-glow)]"
            : "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
        )}
        aria-label="Staff"
      >
        <Users className="h-4 w-4" />
      </Link>
    );
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">Users & Staff</TooltipContent>
        </Tooltip>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium cms-transition",
          inStaff ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent/80",
        )}
      >
        <Users className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">Users & Staff</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded ? (
        <ul className="mt-0.5 ml-4 space-y-0.5 border-l border-border/60 pl-2">
          {items.map((item) => {
            const active = isStaffNavActive(location.pathname, item);
            const badge = item.countKey ? counts[item.countKey] : null;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium cms-transition",
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {badge && badge > 0 ? (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}
