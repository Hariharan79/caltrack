-- Phase 12: allow external food sources (USDA, Open Food Facts) and dedupe by external id.
alter table public.foods drop constraint foods_source_check;
alter table public.foods add constraint foods_source_check
  check (source in ('manual','barcode','import','usda','off'));

alter table public.foods add column source_id text;

create index foods_user_source_external_idx
  on public.foods (user_id, source, source_id)
  where source_id is not null;
