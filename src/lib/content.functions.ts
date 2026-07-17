import { supabase } from "@/integrations/supabase/client";
import { scanCommentContent } from "@/lib/comment-moderation";
import { toAppError } from "@/lib/db-errors";

export const getHomeData = async () => {
  const [articles, war, ambassadors, embassies, ticker, videos, sections] = await Promise.all([
    supabase
      .from("articles")
      .select("id,slug,title,deck,hero_image_url,badge_type,published_at,region,section_id")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(24),
    supabase.from("war_monitor_items").select("*").order("updated_at", { ascending: false }).limit(6),
    supabase.from("ambassadors").select("*").order("featured", { ascending: false }).limit(6),
    supabase.from("embassies").select("*").order("updated_at", { ascending: false }).limit(6),
    supabase.from("ticker_items").select("*").eq("active", true).order("sort_order").limit(20),
    supabase.from("videos").select("*").order("published_at", { ascending: false }).limit(4),
    getSections(),
  ]);

  for (const res of [articles, war, ambassadors, embassies, ticker, videos]) {
    if (res.error) throw toAppError(res.error);
  }

  return {
    articles: articles.data ?? [],
    war: war.data ?? [],
    ambassadors: ambassadors.data ?? [],
    embassies: embassies.data ?? [],
    ticker: ticker.data ?? [],
    videos: videos.data ?? [],
    sections,
  };
};

export const getSections = async ({
  includeHidden = false,
}: { includeHidden?: boolean } = {}) => {
  let query = supabase.from("sections").select("*").order("sort_order").order("name");
  if (!includeHidden) query = query.eq("visibility", "public");
  const { data, error } = await query;
  if (error) {
    // Before taxonomy migration, visibility column may be missing.
    if (/visibility|schema cache|PGRST/i.test(error.message) && !includeHidden) {
      const fallback = await supabase.from("sections").select("*").order("sort_order");
      if (fallback.error) throw toAppError(fallback.error);
      return fallback.data ?? [];
    }
    throw toAppError(error);
  }
  return data ?? [];
};

export const getTicker = async () => {
  const { data, error } = await supabase
    .from("ticker_items")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) throw toAppError(error);
  return data ?? [];
};

export const getSectionWithArticles = async ({ data }: { data: { slug: string } }) => {
  const { data: section, error: sectionError } = await supabase
    .from("sections")
    .select("*")
    .eq("slug", data.slug)
    .maybeSingle();
  if (sectionError) throw toAppError(sectionError);
  if (!section) return { section: null, articles: [] };
  if (section.visibility === "hidden") return { section: null, articles: [] };
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id,slug,title,deck,hero_image_url,badge_type,published_at,region")
    .eq("section_id", section.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(40);
  if (error) throw toAppError(error);
  return { section, articles: articles ?? [] };
};

export const getArticle = async ({ data }: { data: { slug: string } }) => {
  const { data: article, error } = await supabase
    .from("articles")
    .select("*, sections(slug,name,color), author:profiles!articles_author_id_fkey(name,avatar_url,bio)")
    .eq("slug", data.slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!article) return { article: null, related: [] };
  const q = supabase
    .from("articles")
    .select("id,slug,title,deck,hero_image_url,badge_type,published_at")
    .eq("status", "published")
    .neq("id", article.id);
  const relatedRes = article.section_id
    ? await q.eq("section_id", article.section_id).order("published_at", { ascending: false }).limit(4)
    : await q.order("published_at", { ascending: false }).limit(4);
  if (relatedRes.error) throw toAppError(relatedRes.error);
  return { article, related: relatedRes.data ?? [] };
};

export const getAllAmbassadors = async () => {
  const { data, error } = await supabase
    .from("ambassadors")
    .select("*")
    .order("featured", { ascending: false });
  if (error) throw toAppError(error);
  return data ?? [];
};

export const getAmbassador = async ({ data }: { data: { id: string } }) => {
  const { data: amb, error } = await supabase.from("ambassadors").select("*").eq("id", data.id).maybeSingle();
  if (error) throw toAppError(error);
  return amb;
};

export const getAllEmbassies = async () => {
  const { data, error } = await supabase
    .from("embassies")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw toAppError(error);
  return data ?? [];
};

export const getEmbassy = async ({ data }: { data: { id: string } }) => {
  const { data: emb, error } = await supabase
    .from("embassies")
    .select("*, ambassadors(*)")
    .eq("id", data.id)
    .maybeSingle();
  if (error) throw toAppError(error);
  return emb;
};

export const getAllVideos = async () => {
  const { data, error } = await supabase.from("videos").select("*").order("published_at", { ascending: false });
  if (error) throw toAppError(error);
  return data ?? [];
};

export const getLatestArticles = async () => {
  const { data, error } = await supabase
    .from("articles")
    .select("id,slug,title,deck,hero_image_url,badge_type,published_at,region,section_id")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  if (error) throw toAppError(error);
  return data ?? [];
};

export const trackArticleView = async ({ data }: { data: { articleId: string } }) => {
  const { error } = await supabase.rpc("increment_article_view", {
    p_article_id: data.articleId,
  });
  if (error && !/increment_article_view|schema cache|PGRST/i.test(error.message)) {
    console.error("Article view tracking failed", error);
  }
  return { ok: !error };
};

export const getArticleComments = async ({ data }: { data: { articleId: string } }) => {
  const { data: comments, error } = await supabase
    .from("comments")
    .select("id,author_name,body,created_at")
    .eq("article_id", data.articleId)
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw toAppError(error);
  return comments ?? [];
};

export const submitArticleComment = async ({
  data,
}: {
  data: { articleId: string; authorName: string; authorEmail: string; body: string };
}) => {
  const author_name = data.authorName.trim();
  const author_email = data.authorEmail.trim().toLowerCase();
  const body = data.body.trim();
  if (author_name.length < 2 || author_name.length > 80) {
    throw new Error("Name must be between 2 and 80 characters.");
  }
  if (author_email.length < 5 || author_email.length > 254 || !author_email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }
  if (body.length < 2 || body.length > 4000) {
    throw new Error("Comment must be between 2 and 4000 characters.");
  }

  const { data: blocked } = await supabase
    .from("comment_blocks")
    .select("id")
    .eq("email", author_email)
    .maybeSingle();
  if (blocked) {
    throw new Error("This email address is blocked from commenting.");
  }

  const scan = scanCommentContent({ body, authorName: author_name, authorEmail: author_email });
  const payload = {
    article_id: data.articleId,
    author_name,
    author_email,
    body,
    status: scan.status,
    auto_flags: scan.flags,
    moderation_note: scan.note,
  };

  const { error } = await supabase.from("comments").insert(payload);
  if (error) {
    if (/auto_flags|moderation_note|flagged|comment_blocks|schema cache|PGRST/i.test(error.message)) {
      const fallbackStatus = scan.status === "flagged" ? "pending" : scan.status;
      const { error: fallbackError } = await supabase.from("comments").insert({
        article_id: data.articleId,
        author_name,
        author_email,
        body,
        status: fallbackStatus === "spam" ? "spam" : "pending",
      });
      if (fallbackError) {
        if (/blocked from commenting/i.test(fallbackError.message)) {
          throw new Error("This email address is blocked from commenting.");
        }
        throw toAppError(fallbackError);
      }
      return { ok: true, status: fallbackStatus === "spam" ? "spam" : "pending", auto: scan.flags };
    }
    if (/blocked from commenting/i.test(error.message)) {
      throw new Error("This email address is blocked from commenting.");
    }
    throw toAppError(error);
  }
  return { ok: true, status: scan.status, auto: scan.flags };
};

export const getPublicNewsroomSettings = async () => {
  const { data, error } = await supabase
    .from("newsroom_settings")
    .select("publication_name,short_name,tagline,comments_enabled")
    .eq("id", true)
    .maybeSingle();
  if (error && !/newsroom_settings|schema cache|PGRST/i.test(error.message)) throw toAppError(error);
  return data;
};
