// Transforme une erreur Supabase en message lisible en français
export function friendlyError(err, fallback = 'Une erreur est survenue.') {
  if (!err) return ''
  const msg = err.message || String(err)
  if (err.code === 'P0001') return msg // message écrit dans nos fonctions SQL
  if (err.code === '23505') return 'Cet élément existe déjà.'
  if (err.code === '23503') return 'Impossible : cet élément est utilisé ailleurs.'
  if (err.code === '42501' || /row-level security/i.test(msg)) {
    return 'Accès refusé. Reconnecte-toi et réessaie.'
  }
  if (/color_hex/.test(msg)) {
    return "La mise à jour de la base de données n'a pas été faite (colonne color_hex manquante)."
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
    return 'Connexion au serveur impossible. Vérifie ta connexion Internet.'
  }
  return `${fallback} (${msg})`
}
