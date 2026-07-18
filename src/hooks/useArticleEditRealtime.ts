import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Live article row updates while editing (Phase 9). */
export function useArticleEditRealtime(articleId: string | null | undefined) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [remoteUpdatedAt, setRemoteUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!articleId || articleId === "new") {
      setConnected(false);
      return;
    }

    const channel = supabase
      .channel(`article-edit-${articleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "articles",
          filter: `id=eq.${articleId}`,
        },
        (payload) => {
          const next = payload.new as { updated_at?: string; status?: string } | null;
          if (next?.updated_at) setRemoteUpdatedAt(next.updated_at);
          void queryClient.invalidateQueries({ queryKey: ["admin-article", articleId] });
          void queryClient.invalidateQueries({ queryKey: ["article-revisions", articleId] });
          void queryClient.invalidateQueries({ queryKey: ["article-notes", articleId] });
          void queryClient.invalidateQueries({ queryKey: ["article-approvals", articleId] });
        },
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [articleId, queryClient]);

  return { connected, remoteUpdatedAt };
}
