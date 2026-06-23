-- 1. Création de la table pour les projets (réalisations)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tag TEXT NOT NULL,
    image_url TEXT NOT NULL,
    is_before_after BOOLEAN DEFAULT false,
    image_before_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Activer la sécurité au niveau des lignes (RLS) sur la table projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 3. Politiques (Policies) pour la table projects
-- Tout le monde peut lire les projets
CREATE POLICY "Les projets sont publics" ON public.projects
    FOR SELECT USING (true);

-- Seuls les utilisateurs authentifiés peuvent insérer/modifier/supprimer
CREATE POLICY "Les utilisateurs authentifiés peuvent tout faire" ON public.projects
    FOR ALL USING (auth.role() = 'authenticated');

-- 4. Création du bucket de stockage pour les images des projets
INSERT INTO storage.buckets (id, name, public) VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Politiques pour le Storage (images)
-- Tout le monde peut voir les images
CREATE POLICY "Images publiques" ON storage.objects
    FOR SELECT USING (bucket_id = 'project-images');

-- Seuls les utilisateurs authentifiés peuvent uploader, modifier ou supprimer des images
CREATE POLICY "Upload restreint" ON storage.objects
    FOR ALL USING (bucket_id = 'project-images' AND auth.role() = 'authenticated');
