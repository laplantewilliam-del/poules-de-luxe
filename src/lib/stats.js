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
