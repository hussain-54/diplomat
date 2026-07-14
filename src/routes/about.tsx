import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Diplomacy Lens" },
      { name: "description", content: "Diplomacy Lens is an independent global desk covering foreign affairs, embassies and conflict." },
      { property: "og:title", content: "About Diplomacy Lens" },
      { property: "og:description", content: "Independent global reporting on diplomacy, embassies and world affairs." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-4 py-16">
        <p className="eyebrow text-crimson">About Us</p>
        <h1 className="font-serif text-4xl font-bold text-ink md:text-5xl">
          Independent reporting on the world's diplomatic front lines.
        </h1>
        <div className="prose prose-lg mt-8 max-w-none space-y-6 text-foreground">
          <p className="text-lg leading-relaxed text-muted-foreground">
            Diplomacy Lens is a global newsroom covering foreign affairs, embassies, conflict and the
            people who shape international relations. Our correspondents file from more than twenty
            capitals — from Washington and Brussels to Islamabad, Doha and Beijing.
          </p>
          <p className="leading-relaxed">
            We publish original reporting, verified war-zone updates, ambassador profiles and long-form
            analysis. Our standards are simple: primary sources, on-the-record where possible, and full
            corrections when we get something wrong.
          </p>
          <h2 className="font-serif text-2xl font-bold text-ink">Our newsroom</h2>
          <p className="leading-relaxed">
            The Diplomacy Lens desk is led by veteran foreign correspondents with combined experience
            across the BBC, Reuters, Al Jazeera and Dawn. We operate independently and are supported
            by reader subscriptions.
          </p>
          <h2 className="font-serif text-2xl font-bold text-ink">Editorial standards</h2>
          <p className="leading-relaxed">
            Every article is fact-checked and reviewed by a section editor before publication. We
            disclose funding relationships, credit source material and correct errors publicly.
          </p>
          <h2 className="font-serif text-2xl font-bold text-ink">Contact</h2>
          <p className="leading-relaxed">
            Story tips, corrections and press inquiries: <a className="text-crimson hover:underline" href="mailto:desk@diplomacylens.com">desk@diplomacylens.com</a>
          </p>
        </div>
        <div className="mt-12 grid gap-6 border-t border-border pt-8 sm:grid-cols-3">
          {[
            { n: "20+", l: "Bureaus worldwide" },
            { n: "150+", l: "Ambassadors interviewed" },
            { n: "24/7", l: "War monitor desk" },
          ].map((s) => (
            <div key={s.l}>
              <p className="font-serif text-4xl font-bold text-crimson">{s.n}</p>
              <p className="mt-1 text-sm uppercase tracking-wider text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
