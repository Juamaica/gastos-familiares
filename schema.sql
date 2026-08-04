-- =========================================================
-- PROYECTO: App de Gastos Familiares
-- Ejecutar este script completo en: Supabase > SQL Editor > New query
-- =========================================================

-- Tabla: familia
-- Guarda los datos generales del "grupo familiar" (una sola fila por proyecto)
create table if not exists familia (
  id uuid primary key default gen_random_uuid(),
  nombre_familia text default 'Mi Familia',
  foto_url text,
  creado_en timestamptz default now()
);

-- Tabla: perfiles
-- No se usa todavía (fase 1), queda lista para cuando se active login + roles (fase 2)
create table if not exists perfiles (
  id uuid primary key default gen_random_uuid(),
  nombre text,
  rol text default 'sin_asignar',   -- valores futuros: admin, padre, madre, hijo
  familia_id uuid references familia(id),
  creado_en timestamptz default now()
);

-- Tabla: gastos
-- Tabla principal del CRUD. usuario_id queda listo para cuando exista login (fase 2)
create table if not exists gastos (
  id uuid primary key default gen_random_uuid(),
  descripcion text not null,
  monto numeric not null,
  categoria text not null default 'Otros',
  fecha date not null default current_date,
  usuario_id uuid,                  -- se llenará cuando se active Supabase Auth
  creado_en timestamptz default now()
);

-- =========================================================
-- SEGURIDAD (RLS - Row Level Security)
-- Por ahora se deja ABIERTO a propósito, porque el proyecto no tiene login todavía.
-- Cuando se implemente login + roles (fase 2), se debe:
--   1) Ejecutar: alter table gastos enable row level security;
--   2) Crear políticas usando auth.uid() y familia_id
-- Se deja el bloque comentado como referencia para esa fase futura.
-- =========================================================

-- alter table gastos enable row level security;
-- create policy "Cada usuario ve solo sus gastos"
--   on gastos for select
--   using (auth.uid() = usuario_id);

-- =========================================================
-- STORAGE (foto familiar)
-- Este bucket se crea manualmente desde el Dashboard de Supabase:
-- Storage > New bucket > nombre: fotos-familia > Public bucket: activado
-- (los pasos exactos están en el README.md)
-- =========================================================
