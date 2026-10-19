import { supabase } from './supabase'
import { fetchAll } from './fetchAll'

const table = (name, select, order = 'id') =>
  fetchAll(() => supabase.from(name).select(select).order(order))

// Lit toutes les tables nécessaires à l'export
export async function loadExportData() {
  const [categories, creations, variants, yarns, markets, sales, movements] = await Promise.all([
    table('categories', 'id, name', 'name'),
    table('creations', 'id, name, category_id, price, cost, is_active', 'name'),
    table('variants', 'id, stock_quantity, is_active, creations(name), yarns(brand, color, sku)'),
    table('yarns', 'id, brand, color, sku, reorder_url, is_active', 'brand'),
    table('markets', 'id, name, location, start_date, end_date, is_open_ended, booth_cost, final_amount', 'start_date'),
    table(
      'sales',
      'id, quantity, unit_price, unit_cost, sold_at, entry_mode, cancelled_at, markets(name), variants(creations(name), yarns(color))',
    ),
    table(
      'stock_movements',
      'id, movement_type, quantity_change, note, created_at, variants(creations(name), yarns(color))',
    ),
  ])
  const failed = [categories, creations, variants, yarns, markets, sales, movements].find((r) => r.error)
  if (failed) return { error: failed.error, data: null }
  return {
    error: null,
    data: {
      categories: categories.data,
      creations: creations.data,
      variants: variants.data,
      yarns: yarns.data,
      markets: markets.data,
      sales: sales.data,
      movements: movements.data,
    },
  }
}
