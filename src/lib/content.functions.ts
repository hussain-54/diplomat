import { supabase } from "@/integrations/supabase/client";

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
  const { data } = await supabase.from("sections").select("*").order("sort_order");
  return data ?? [];
};

export const getTicker = async () => {
  const { data } = await supabase
    .from("ticker_items")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  return data ?? [];
};

export const getSectionWithArticles = async ({ data }: { data: { slug: string } }) => {
  const { data: section } = await supabase
    .from("sections")
    .select("*")
    .eq("slug", data.slug)
    .maybeSingle();
  if (!section) return { section: null, articles: [] };
  const { data: articles } = await supabase
    .from("articles")
    .select("id,slug,title,deck,hero_image_url,badge_type,published_at,region")
    .eq("section_id", section.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(40);
  return { section, articles: articles ?? [] };
};

export const getArticle = async ({ data }: { data: { slug: string } }) => {
  const { data: article } = await supabase
    .from("articles")
    .select("*, sections(slug,name,color)")
    .eq("slug", data.slug)
    .eq("status", "published")
    .maybeSingle();
  if (!article) return { article: null, related: [] };
  const q = supabase
    .from("articles")
    .select("id,slug,title,deck,hero_image_url,badge_type,published_at")
    .eq("status", "published")
    .neq("id", article.id);
  const { data: related } = article.section_id
    ? await q.eq("section_id", article.section_id).order("published_at", { ascending: false }).limit(4)
    : await q.order("published_at", { ascending: false }).limit(4);
  return { article, related: related ?? [] };
};

export const getAllAmbassadors = async () => {
  const { data } = await supabase.from("ambassadors").select("*").order("featured", { ascending: false });
  return data ?? [];
};

export const getAmbassador = async ({ data }: { data: { id: string } }) => {
  const { data: amb } = await supabase.from("ambassadors").select("*").eq("id", data.id).maybeSingle();
  return amb;
};

export const getAllEmbassies = async () => {
  const { data } = await supabase.from("embassies").select("*").order("updated_at", { ascending: false });
  return data ?? [];
};

export const getEmbassy = async ({ data }: { data: { id: string } }) => {
  const { data: emb } = await supabase
    .from("embassies")
    .select("*, ambassadors(*)")
    .eq("id", data.id)
    .maybeSingle();
  return emb;
};

export const getAllVideos = async () => {
  const { data } = await supabase.from("videos").select("*").order("published_at", { ascending: false });
  return data ?? [];
};

export const getLatestArticles = async () => {
  const { data } = await supabase
    .from("articles")
    .select("id,slug,title,deck,hero_image_url,badge_type,published_at,region,section_id")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  return data ?? [];
};
