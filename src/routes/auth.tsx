import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { SiteShell } from "@/components/site-shell";
import { z } from "zod";

const authSearchSchema = z.object({
  redirect: z
    .union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])
    .optional()
    .transform((v) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : undefined)),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => authSearchSchema.parse(search),
  head: () => ({ meta: [{ title: "Sign in — Diplomacy Lens" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect: redirectTo } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { user } = useSession();
  const navigate = useNavigate();

  const goAfterAuth = () => {
    if (redirectTo?.startsWith("/") && !redirectTo.startsWith("//")) {
      window.location.assign(redirectTo);
      return;
    }
    navigate({ to: "/admin" });
  };

  if (user) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="eyebrow text-crimson">Signed in</div>
          <h1 className="mt-2 font-serif text-3xl text-ink">You're signed in</h1>
          <p className="mt-2 text-muted-foreground">{user.email}</p>
          <Link
            to="/admin"
            className="mt-6 inline-block rounded-sm bg-navy px-4 py-2 text-sm font-semibold text-navy-foreground"
          >
            Open newsroom
          </Link>
        </div>
      </SiteShell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/admin",
            data: { name },
          },
        });
        if (error) throw error;
        setMsg(
          "Account created as Contributor (drafts only). A Super Admin can assign another newsroom role. If email confirmation is enabled, check your inbox.",
        );
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        goAfterAuth();
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin + (redirectTo || "/admin") },
        });
        if (error) throw error;
        setMsg("Magic link sent. Check your email.");
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="eyebrow text-crimson">Newsroom access</div>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          {mode === "signup" ? "Create an editor account" : mode === "magic" ? "Magic link sign in" : "Sign in"}
        </h1>
        <div className="mt-4 flex gap-2 text-xs font-semibold uppercase tracking-widest">
          {(["signin", "signup", "magic"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-sm px-3 py-1.5 ${mode === m ? "bg-navy text-navy-foreground" : "border border-input"}`}
            >
              {m === "signin" ? "Password" : m === "signup" ? "Sign up" : "Magic link"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="eyebrow text-muted-foreground">Full name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2"
              />
            </div>
          )}
          <div>
            <label className="eyebrow text-muted-foreground">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2"
            />
          </div>
          {mode !== "magic" && (
            <div>
              <label className="eyebrow text-muted-foreground">Password</label>
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-sm bg-navy px-4 py-2.5 text-sm font-semibold uppercase tracking-widest text-navy-foreground disabled:opacity-50"
          >
            {busy ? "…" : mode === "signup" ? "Create account" : mode === "magic" ? "Send link" : "Sign in"}
          </button>
          {msg && <div className="rounded-sm border border-border bg-secondary p-3 text-sm">{msg}</div>}
        </form>
      </div>
    </SiteShell>
  );
}
