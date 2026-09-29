-- ==============================================================================
-- Vintage 29 — Esquema Supabase (canal online): plantilla + variantes
-- Ejecutar completo en el SQL Editor de Supabase.
-- ==============================================================================

-- Limpieza del modelo aplanado anterior (fase de prueba).
-- `inventory_movements` se recrea porque apunta a la tabla vieja `variants`.
DROP TABLE IF EXISTS public.inventory_movements CASCADE;
DROP TABLE IF EXISTS public.variants CASCADE;

-- 1. Categorías
CREATE TABLE IF NOT EXISTS public.categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT,
    description TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Productos (plantilla publicada en la tienda)
CREATE TABLE IF NOT EXISTS public.products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT true,
    odoo_template_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Variantes vendibles (talla/color + stock online)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT NOT NULL UNIQUE,
    size TEXT NOT NULL,
    color TEXT NOT NULL,
    stock_online_qty INTEGER NOT NULL DEFAULT 0,
    reserved_qty INTEGER NOT NULL DEFAULT 0,
    sold_qty INTEGER NOT NULL DEFAULT 0,
    threshold INTEGER NOT NULL DEFAULT 2,
    is_active BOOLEAN NOT NULL DEFAULT true,
    odoo_product_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Movimientos de inventario (auditoría / kardex)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id BIGSERIAL PRIMARY KEY,
    variant_id BIGINT REFERENCES public.product_variants(id) ON DELETE SET NULL,
    date TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI'),
    sku TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Entrada', 'Ajuste', 'Venta', 'Reserva')),
    quantity INTEGER NOT NULL,
    reason TEXT NOT NULL,
    user_email TEXT NOT NULL DEFAULT 'admin@vintage29',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Portada web (hero y subportadas)
CREATE TABLE IF NOT EXISTS public.hero_slides (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('video', 'banner')),
    zone TEXT NOT NULL CHECK (zone IN ('main', 'sub')),
    title TEXT NOT NULL DEFAULT '',
    subtitle TEXT DEFAULT '',
    button_text TEXT DEFAULT '',
    link_url TEXT DEFAULT '',
    media_url TEXT DEFAULT '',
    overlay_opacity INTEGER NOT NULL DEFAULT 30 CHECK (overlay_opacity >= 0 AND overlay_opacity <= 100),
    alignment TEXT NOT NULL DEFAULT 'center' CHECK (alignment IN ('left', 'center', 'right')),
    is_published BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Zonas de envío
CREATE TABLE IF NOT EXISTS public.shipping_zones (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    estimated_delivery TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_sku ON public.inventory_movements(sku);
CREATE INDEX IF NOT EXISTS idx_hero_slides_zone ON public.hero_slides(zone, order_index);

-- Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

-- NOTA DE SEGURIDAD: estas políticas son permisivas para la fase de prueba.
-- Antes de producción: separar lectura pública (storefront) de escritura autenticada
-- y prohibir la escritura con la anon key (ver docs/10 §7.4).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura pública de categorias') THEN
        CREATE POLICY "Lectura pública de categorias" ON public.categories FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura pública de productos') THEN
        CREATE POLICY "Lectura pública de productos" ON public.products FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura pública de variantes') THEN
        CREATE POLICY "Lectura pública de variantes" ON public.product_variants FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura pública de slides') THEN
        CREATE POLICY "Lectura pública de slides" ON public.hero_slides FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura pública de envios') THEN
        CREATE POLICY "Lectura pública de envios" ON public.shipping_zones FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura pública de movimientos') THEN
        CREATE POLICY "Lectura pública de movimientos" ON public.inventory_movements FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso total a categorias') THEN
        CREATE POLICY "Acceso total a categorias" ON public.categories FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso total a productos') THEN
        CREATE POLICY "Acceso total a productos" ON public.products FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso total a variantes') THEN
        CREATE POLICY "Acceso total a variantes" ON public.product_variants FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso total a movimientos') THEN
        CREATE POLICY "Acceso total a movimientos" ON public.inventory_movements FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso total a slides') THEN
        CREATE POLICY "Acceso total a slides" ON public.hero_slides FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso total a envios') THEN
        CREATE POLICY "Acceso total a envios" ON public.shipping_zones FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
