const cents = (n) => Math.round(n * 100) / 100

// Totaux d'un marché à partir de ses lignes de vente (les ventes annulées sont ignorées).
// Revenu = montant final encaissé s'il est rempli, sinon somme des prix du catalogue.
// Profit = revenu - coût de l'emplacement - coût de revient des ventes qui en ont un.
export function marketTotals(market, sales) {
  const live = sales.filter((s) => !s.cancelled_at)
  const pieces = live.reduce((t, s) => t + s.quantity, 0)
  const catalogRevenue = cents(live.reduce((t, s) => t + s.quantity * Number(s.unit_price), 0))
  const hasFinal = market.final_amount !== null && market.final_amount !== undefined
  const revenue = hasFinal ? cents(Number(market.final_amount)) : catalogRevenue
  const costOfGoods = cents(
    live.reduce((t, s) => (s.unit_cost === null || s.unit_cost === undefined ? t : t + s.quantity * Number(s.unit_cost)), 0),
  )
  const missingCost = live.filter((s) => s.unit_cost === null || s.unit_cost === undefined).length
  const booth = cents(Number(market.booth_cost || 0))
  return {
    pieces,
    lines: live.length,
    catalogRevenue,
    revenue,
    usesFinalAmount: hasFinal,
    booth,
    costOfGoods,
    missingCost,
    profit: cents(revenue - booth - costOfGoods),
  }
}

// Marchés sans fin d'abord, puis du plus récent au plus ancien
export function sortMarkets(list) {
  return [...list].sort((a, b) => {
    if (a.is_open_ended !== b.is_open_ended) return a.is_open_ended ? -1 : 1
    return String(b.start_date).localeCompare(String(a.start_date))
  })
}

// ---------- Statistiques de ventes ----------

export const PRICE_BINS = [
  { key: 'lt10', label: 'Moins de 10 $', min: 0, max: 10 },
  { key: '10', label: '10 $ à 19,99 $', min: 10, max: 20 },
  { key: '20', label: '20 $ à 29,99 $', min: 20, max: 30 },
  { key: '30', label: '30 $ et plus', min: 30, max: Infinity },
]

// Ligne de vente de l'API (avec ses jointures) -> objet plat
export function flattenSale(r) {
  const v = r.variants || {}
  const c = v.creations || {}
  const y = v.yarns || {}
  return {
    id: r.id,
    market_id: r.market_id,
    quantity: r.quantity,
    unit_price: Number(r.unit_price),
    unit_cost: r.unit_cost === null || r.unit_cost === undefined ? null : Number(r.unit_cost),
    sold_at: r.sold_at,
    cancelled_at: r.cancelled_at,
    creationId: c.id ?? v.creation_id ?? null,
    creation: c.name || 'Création inconnue',
    category: (c.categories && c.categories.name) || 'Sans catégorie',
    yarnKey: `${y.brand || ''}|${y.color || ''}`,
    yarnLabel: y.brand || y.color ? `${y.brand || ''} · ${y.color || ''}` : 'Laine inconnue',
  }
}

// 'YYYY-MM-DD' (heure locale) d'un horodatage
export function localDateKey(iso) {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Ventes non annulées, filtrées par marché et par période (dates 'YYYY-MM-DD' incluses)
export function filterSales(sales, { marketId = null, from = '', to = '' } = {}) {
  return sales.filter((s) => {
    if (s.cancelled_at) return false
    if (marketId && s.market_id !== marketId) return false
    if (from || to) {
      const day = localDateKey(s.sold_at)
      if (from && day < from) return false
      if (to && day > to) return false
    }
    return true
  })
}

// Regroupe par clé : pièces et revenu (prix du catalogue), du plus vendu au moins vendu
export function rankBy(sales, keyFn, labelFn) {
  const map = new Map()
  for (const s of sales) {
    const key = keyFn(s)
    const row = map.get(key) || { key, label: labelFn(s), pieces: 0, revenue: 0 }
    row.pieces += s.quantity
    row.revenue = cents(row.revenue + s.quantity * s.unit_price)
    map.set(key, row)
  }
  return [...map.values()].sort(
    (a, b) => b.pieces - a.pieces || b.revenue - a.revenue || a.label.localeCompare(b.label, 'fr'),
  )
}

export const topCreations = (sales) => rankBy(sales, (s) => s.creationId ?? s.creation, (s) => s.creation)
export const topYarns = (sales) => rankBy(sales, (s) => s.yarnKey, (s) => s.yarnLabel)
export const byCategory = (sales) => rankBy(sales, (s) => s.category, (s) => s.category)

// Toutes les tranches sont retournées (même à 0), dans l'ordre des prix
export function byPriceRange(sales) {
  return PRICE_BINS.map((bin) => {
    let pieces = 0
    let revenue = 0
    for (const s of sales) {
      if (s.unit_price >= bin.min && s.unit_price < bin.max) {
        pieces += s.quantity
        revenue = cents(revenue + s.quantity * s.unit_price)
      }
    }
    return { key: bin.key, label: bin.label, pieces, revenue }
  })
}

// Dernier marché à date de fin fixe : début le plus récent, déjà commencé
export function lastFixedMarket(markets, today) {
  return (
    [...markets]
      .filter((m) => !m.is_open_ended && m.start_date <= today)
      .sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)))[0] || null
  )
}
