import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type PresencePayload = {
  presence_ref?: string;
  scope?: string;
};

export function useLiveVisitors(trackPublicVisitor = false) {
  const [count, setCount] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const visitorId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel("newsroom-live-visitors", {
      config: { presence: { key: visitorId } },
    });

    const updateCount = () => {
      const state = channel.presenceState<PresencePayload>();
      const publicVisitors = Object.values(state)
        .flat()
        .filter((presence) => presence.scope === "public");
      setCount(publicVisitors.length);
    };

    channel
      .on("presence", { event: "sync" }, updateCount)
      .on("presence", { event: "join" }, updateCount)
      .on("presence", { event: "leave" }, updateCount)
      .subscribe(async (status) => {
        const isConnected = status === "SUBSCRIBED";
        setConnected(isConnected);
        if (isConnected && trackPublicVisitor) {
          await channel.track({
            scope: "public",
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [trackPublicVisitor]);

  return { count, connected };
}
