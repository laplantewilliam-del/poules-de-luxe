import { supabase } from './supabase'

// Toutes les couleurs actives des créations actives, triées par création puis couleur.
export async function loadActiveVariants() {
  const { data, error } = await supabase
    .from('variants')
    .select('id, stock_quantity, creations(id, name, is_active), yarns(brand, color, color_hex)')
    .eq('is_active', true)
  if (error) return { error, variants: [] }
  const variants = data
    .filter((v) => v.creations && v.creations.is_active)
    .map((v) => ({
      id: v.id,
      stock: v.stock_quantity,
      creationId: v.creations.id,
      creation: v.creations.name,
      color: v.yarns?.color || '',
      brand: v.yarns?.brand || '',
      hex: v.yarns?.color_hex || '#CDBE9F',
    }))
    .sort(
      (a, b) =>
        a.creation.localeCompare(b.creation, 'fr') || a.color.localeCompare(b.color, 'fr'),
    )
  return { error: null, variants }
}

export function groupByCreation(variants) {
  const groups = []
  for (const v of variants) {
    let g = groups[groups.length - 1]
    if (!g || g.id !== v.creationId) {
      g = { id: v.creationId, name: v.creation, variants: [] }
      groups.push(g)
    }
    g.variants.push(v)
  }
  return groups
}
