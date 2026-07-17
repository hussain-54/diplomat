import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).send(JSON.stringify(body));
}

function adminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for staff administration.",
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireStaffManager(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    const err = new Error("Sign in required.");
    err.status = 401;
    throw err;
  }
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error("Missing Supabase public credentials.");
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    const err = new Error("Invalid or expired session.");
    err.status = 401;
    throw err;
  }

  const { data: roles, error: rolesError } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (rolesError) throw rolesError;

  const isSuperAdmin = (roles ?? []).some((row) => row.role === "super_admin");
  if (!isSuperAdmin) {
    const err = new Error("Staff management requires Super Admin.");
    err.status = 403;
    throw err;
  }

  return { user, admin: adminClient() };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const { user, admin } = await requireStaffManager(req);
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const action = body.action;

    if (action === "invite") {
      const email = String(body.email || "")
        .trim()
        .toLowerCase();
      const name = String(body.name || "").trim();
      const bylineName = String(body.byline_name || "").trim();
      const role = String(body.role || "contributor").trim();
      const sectionIds = Array.isArray(body.section_ids) ? body.section_ids : [];
      if (!email || !email.includes("@")) {
        return json(res, 400, { error: "A valid email is required." });
      }

      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
        email,
        {
          data: { name, invited: "true", byline_name: bylineName },
          redirectTo: `${process.env.SITE_URL || process.env.VITE_SITE_URL || ""}/auth`,
        },
      );
      if (inviteError) throw inviteError;
      const userId = invited.user?.id;
      if (!userId) throw new Error("Invite succeeded but no user id was returned.");

      await admin.from("profiles").upsert({
        id: userId,
        email,
        name: name || email.split("@")[0],
        byline_name: bylineName || null,
        status: "invited",
        social_links: {},
      });

      if (role) {
        await admin.from("user_roles").upsert(
          { user_id: userId, role },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
      }

      for (const sectionId of sectionIds) {
        await admin.from("editor_section_access").upsert(
          { profile_id: userId, section_id: sectionId },
          { onConflict: "profile_id,section_id", ignoreDuplicates: true },
        );
      }

      return json(res, 200, { ok: true, user_id: userId });
    }

    if (action === "suspend" || action === "unsuspend") {
      const userId = String(body.user_id || "");
      if (!userId) return json(res, 400, { error: "user_id is required." });
      if (userId === user.id) {
        return json(res, 400, { error: "You cannot suspend your own account." });
      }

      if (action === "suspend") {
        const { error: banError } = await admin.auth.admin.updateUserById(userId, {
          ban_duration: "876000h",
        });
        if (banError) throw banError;
        const { error: profileError } = await admin
          .from("profiles")
          .update({ status: "suspended" })
          .eq("id", userId);
        if (profileError) throw profileError;
      } else {
        const { error: banError } = await admin.auth.admin.updateUserById(userId, {
          ban_duration: "none",
        });
        if (banError) throw banError;
        const { error: profileError } = await admin
          .from("profiles")
          .update({ status: "active" })
          .eq("id", userId);
        if (profileError) throw profileError;
      }

      return json(res, 200, { ok: true });
    }

    if (action === "reset_password") {
      const email = String(body.email || "")
        .trim()
        .toLowerCase();
      if (!email) return json(res, 400, { error: "email is required." });
      const origin =
        process.env.SITE_URL ||
        process.env.VITE_SITE_URL ||
        `${req.headers["x-forwarded-proto"] || "https"}://${req.headers["x-forwarded-host"] || req.headers.host}`;
      const { error } = await admin.auth.resetPasswordForEmail(email, {
        redirectTo: `${String(origin).replace(/\/+$/, "")}/auth`,
      });
      if (error) throw error;
      return json(res, 200, { ok: true });
    }

    if (action === "mfa_status") {
      const userId = String(body.user_id || "");
      if (!userId) return json(res, 400, { error: "user_id is required." });
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) throw error;
      const factors = data.user?.factors ?? [];
      const mfa_enabled = factors.some(
        (factor) => factor.status === "verified" || factor.status === "verified_active",
      );
      return json(res, 200, { ok: true, mfa_enabled, factors: factors.length });
    }

    return json(res, 400, { error: `Unknown action: ${action}` });
  } catch (error) {
    console.error(error);
    return json(res, error.status || 500, {
      error: error.message || "Staff administration failed.",
    });
  }
}
