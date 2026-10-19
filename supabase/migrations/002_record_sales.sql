-- Saisie de plusieurs lignes de vente en une seule opération (tout ou rien).
-- p_lines : [{"variant_id": 1, "quantity": 2}, ...]
create or replace function record_sales(
  p_market_id bigint,
  p_lines jsonb,
  p_sold_at timestamptz default now()
) returns integer
language plpgsql
as $$
declare
  r jsonb;
  n integer := 0;
begin
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Aucune ligne de vente à enregistrer';
  end if;

  for r in select value from jsonb_array_elements(p_lines) as t(value) loop
    perform record_sale(
      p_market_id,
      (r->>'variant_id')::bigint,
      (r->>'quantity')::integer,
      'direct',
      p_sold_at
    );
    n := n + 1;
  end loop;

  return n;
end;
$$;

revoke all on function record_sales(bigint, jsonb, timestamptz) from public, anon;
grant execute on function record_sales(bigint, jsonb, timestamptz) to authenticated;
