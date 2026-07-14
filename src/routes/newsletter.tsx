import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/newsletter")({
  head: () => ({
    meta: [
      { title: "Newsletter — Diplomacy Lens" },
      { name: "description", content: "Daily diplomatic briefings delivered to your inbox." },
      { property: "og:title", content: "Diplomacy Lens Newsletter" },
      { property: "og:description", content: "Daily diplomatic briefings delivered to your inbox." },
    ],
  }),
  component: NewsletterPage,
});

function NewsletterPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-4 py-16">
        <p className="eyebrow text-crimson">Subscribe</p>
        <h1 className="font-serif text-4xl font-bold text-ink md:text-5xl">The Diplomacy Lens Briefing</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A concise morning digest of what happened in embassies, capitals and war rooms overnight —
          curated by our global bureau desk.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email.includes("@")) setDone(true);
          }}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 rounded-sm border border-input bg-background px-4 py-3 text-sm outline-none focus:border-navy"
          />
          <button
            type="submit"
            className="rounded-sm bg-crimson px-6 py-3 text-xs font-semibold uppercase tracking-wider text-crimson-foreground hover:opacity-90"
          >
            Subscribe
          </button>
        </form>
        {done && <p className="mt-4 text-sm text-navy">Thanks — you'll receive tomorrow's briefing.</p>}
        <div className="mt-12 grid gap-6 border-t border-border pt-8 md:grid-cols-3">
          {[
            { t: "Morning Brief", d: "Overnight developments, 6am local." },
            { t: "War Monitor", d: "Weekly conflict intelligence roundup." },
            { t: "Embassy Watch", d: "Diplomatic postings and recalls." },
          ].map((s) => (
            <div key={s.t}>
              <h3 className="font-serif text-xl font-bold text-ink">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
