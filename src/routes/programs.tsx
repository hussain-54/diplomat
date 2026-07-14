import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/programs")({
  head: () => ({ meta: [{ title: "Programs — Diplomacy Lens" }] }),
  component: () => (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="eyebrow text-crimson">Programs</div>
        <h1 className="mt-2 font-serif text-5xl text-ink">Original programming</h1>
        <p className="mt-6 text-muted-foreground">
          Diplomatic Roundtable, Ambassador at Large, and Foreign Desk Live return this season.
          Full schedule announced ahead of launch.
        </p>
      </div>
    </SiteShell>
  ),
});
