-- PAN21 Counter — Supabase Schema
-- Projekt: pan21counter (neues Supabase-Projekt anlegen)

-- Registrierte Websites
CREATE TABLE public.pc_sites (
  id          BIGSERIAL PRIMARY KEY,
  site_id     TEXT NOT NULL UNIQUE,           -- z.B. "A3F9B2"
  email       TEXT NOT NULL,
  url         TEXT NOT NULL,                  -- nur Hostname, z.B. "example.de"
  sitename    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Pageview-Hits
CREATE TABLE public.pc_hits (
  id          BIGSERIAL PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES public.pc_sites(site_id) ON DELETE CASCADE,
  ip_hash     TEXT NOT NULL,                  -- SHA256(ip + date + site_id), 16 Zeichen
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  is_unique   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index für schnelle Abfragen
CREATE INDEX idx_pc_hits_site_date ON public.pc_hits(site_id, date);
CREATE INDEX idx_pc_hits_site_id   ON public.pc_hits(site_id);

-- Stored Procedure: Gesamtstatistik für eine Site
CREATE OR REPLACE FUNCTION get_site_stats(p_site_id TEXT)
RETURNS TABLE(total_views BIGINT, total_unique BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_views,
    COUNT(*) FILTER (WHERE is_unique = true)::BIGINT AS total_unique
  FROM public.pc_hits
  WHERE site_id = p_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS aktivieren
ALTER TABLE public.pc_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_hits  ENABLE ROW LEVEL SECURITY;

-- Nur service_role (Backend) hat Zugriff
CREATE POLICY "service_role only" ON public.pc_sites USING (auth.role() = 'service_role');
CREATE POLICY "service_role only" ON public.pc_hits  USING (auth.role() = 'service_role');

-- pc_sites-Tabelle: URL in stats-public API mitliefern (JOIN)
-- Dafür braucht stats-public.js einen kleinen Anpass (site-name aus pc_sites holen)
