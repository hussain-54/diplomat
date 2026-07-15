import { supabase } from "@/integrations/supabase/client";
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
    supabase.from("sections").select("*").order("sort_order"),
  ]);

  for (const res of [articles, war, ambassadors, embassies, ticker, videos, sections]) {
    if (res.error) throw toAppError(res.error);
  }

  return {
    articles: articles.data ?? [],
    war: war.data ?? [],
    ambassadors: ambassadors.data ?? [],
    embassies: embassies.data ?? [],
    ticker: ticker.data ?? [],
    videos: videos.data ?? [],
    sections: sections.data ?? [],
  };
};

export const getSections = async () => {
  const { data, error } = await supabase.from("sections").select("*").order("sort_order");
  if (error) throw toAppError(error);
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
    .select("*, sections(slug,name,color)")
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
