create table if not exists public."TBL_Festivos_Solvi" (
  fecha_festivo date primary key,
  dia_semana text not null,
  nombre_festivo text not null,
  source_year integer not null,
  synced_at timestamptz not null default now()
);

create index if not exists tbl_festivos_solvi_source_year_idx
  on public."TBL_Festivos_Solvi" (source_year);
