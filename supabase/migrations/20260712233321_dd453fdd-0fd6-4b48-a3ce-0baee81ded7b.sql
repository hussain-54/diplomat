
CREATE POLICY "public read hero" ON storage.objects FOR SELECT USING (bucket_id = 'article-hero');
CREATE POLICY "public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "authed upload hero" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'article-hero');
CREATE POLICY "authed upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "authed update hero" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('article-hero','avatars'));
CREATE POLICY "authed delete hero" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('article-hero','avatars'));
