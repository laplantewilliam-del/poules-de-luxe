import { supabase } from './supabase'
import { fetchAll } from './fetchAll'
import { flattenSale } from './stats'

// Toutes les lignes de vente (y compris annulées), aplaties pour les statistiques
export async function loadSalesFlat() {
  const { data, error } = await fetchAll(() =>
    supabase
      .from('sales')
      .select(
        'id, market_id, quantity, unit_price, unit_cost, sold_at, cancelled_at, variants(creation_id, creations(id, name, categories(name)), yarns(brand, color))',
      )
      .order('id'),
  )
  if (error) return { error, sales: [] }
  return { error: null, sales: data.map(flattenSale) }
}
