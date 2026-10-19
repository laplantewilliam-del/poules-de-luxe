// Lit toutes les lignes d'une requête, par pages (l'API limite chaque réponse à 1000 lignes).
// makeQuery doit retourner une nouvelle requête triée de façon stable (ex. .order('id')).
export async function fetchAll(makeQuery, pageSize = 1000) {
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1)
    if (error) return { data: null, error }
    rows.push(...data)
    if (data.length < pageSize) break
  }
  return { data: rows, error: null }
}
