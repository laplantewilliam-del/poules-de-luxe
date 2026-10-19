const money = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' })

export const formatMoney = (n) =>
  n === null || n === undefined ? '' : money.format(Number(n))

// Texte -> montant. Vide = null, invalide = NaN. Accepte la virgule.
export function parseAmount(text) {
  const s = String(text ?? '').trim().replace(/\s/g, '').replace(',', '.')
  if (s === '') return null
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN
  return Number(s)
}

// Texte -> entier (négatif permis). Invalide ou vide = NaN.
export function parseInteger(text) {
  const s = String(text ?? '').trim()
  if (!/^-?\d+$/.test(s)) return NaN
  return Number(s)
}

// Minuscules sans accents, pour la recherche
export function normalize(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Retourne l'adresse seulement si elle commence par http ou https
export function safeUrl(u) {
  try {
    const x = new URL(u)
    return x.protocol === 'http:' || x.protocol === 'https:' ? x.href : null
  } catch {
    return null
  }
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' })
}
