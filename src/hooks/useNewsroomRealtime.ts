import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useNewsroomRealtime() {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const refreshArticles = () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard-articles"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-performance"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      void queryClient.invalidateQueries({ queryKey: ["article-revisions"] });
      void queryClient.invalidateQueries({ queryKey: ["cms-analytics"] });
    };
    const refreshComments = () => {
      void queryClient.invalidateQueries({ queryKey: ["cms-analytics"] });
      void queryClient.invalidateQueries({ queryKey: ["comments"] });
    };
    const refreshAlerts = () => {
      void queryClient.invalidateQueries({ queryKey: ["ticker"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-alerts"] });
    };

    const channel = supabase
      .channel("newsroom-dashboard-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "articles" }, refreshArticles)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, refreshComments)
      .on("postgres_changes", { event: "*", schema: "public", table: "ticker_items" }, refreshAlerts)
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return connected;
}
