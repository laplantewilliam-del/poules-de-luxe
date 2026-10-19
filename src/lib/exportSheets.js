// Construit les onglets du fichier Excel à partir des données brutes (fonction pure, testable).

const head = (labels) => labels.map((value) => ({ value, fontWeight: 'bold' }))
const pad = (n) => String(n).padStart(2, '0')

function stamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const yesNo = (b) => (b ? 'Oui' : 'Non')
const cell = (v) => (v === null || v === undefined ? null : v)

const MOVEMENT_LABELS = {
  ajout: 'Ajout',
  vente: 'Vente',
  ajustement: 'Ajustement',
  annulation_vente: 'Annulation de vente',
}

export function buildSheets({ categories, creations, variants, yarns, markets, sales, movements }) {
  const catName = new Map(categories.map((c) => [c.id, c.name]))

  const sheetCreations = {
    sheet: 'Créations',
    columns: [{ width: 32 }, { width: 18 }, { width: 12 }, { width: 14 }, { width: 10 }],
    data: [
      head(['Nom', 'Catégorie', 'Prix', 'Coût de revient', 'Active']),
      ...creations.map((c) => [c.name, catName.get(c.category_id) || '', Number(c.price), c.cost === null ? null : Number(c.cost), yesNo(c.is_active)]),
    ],
  }

  const sheetVariants = {
    sheet: 'Couleurs et stock',
    columns: [{ width: 32 }, { width: 20 }, { width: 20 }, { width: 16 }, { width: 10 }, { width: 10 }],
    data: [
      head(['Création', 'Marque', 'Couleur', 'SKU', 'Stock', 'Active']),
      ...variants.map((v) => [
        v.creations?.name || '',
        v.yarns?.brand || '',
        v.yarns?.color || '',
        cell(v.yarns?.sku),
        v.stock_quantity,
        yesNo(v.is_active),
      ]),
    ],
  }

  const sheetYarns = {
    sheet: 'Laines',
    columns: [{ width: 20 }, { width: 20 }, { width: 16 }, { width: 50 }, { width: 10 }],
    data: [
      head(['Marque', 'Couleur', 'SKU', 'Lien pour recommander', 'Active']),
      ...yarns.map((y) => [y.brand, y.color, cell(y.sku), cell(y.reorder_url), yesNo(y.is_active)]),
    ],
  }

  const sheetMarkets = {
    sheet: 'Marchés',
    columns: [{ width: 28 }, { width: 22 }, { width: 14 }, { width: 14 }, { width: 10 }, { width: 18 }, { width: 22 }],
    data: [
      head(['Nom', 'Lieu', 'Début', 'Fin', 'Sans fin', "Coût de l'emplacement", 'Montant final encaissé']),
      ...markets.map((m) => [
        m.name,
        cell(m.location),
        m.start_date,
        cell(m.end_date),
        yesNo(m.is_open_ended),
        Number(m.booth_cost),
        m.final_amount === null ? null : Number(m.final_amount),
      ]),
    ],
  }

  const sheetSales = {
    sheet: 'Ventes',
    columns: [{ width: 18 }, { width: 28 }, { width: 32 }, { width: 20 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 10 }],
    data: [
      head(['Date et heure', 'Marché', 'Création', 'Couleur', 'Quantité', 'Prix unitaire', 'Coût unitaire', 'Mode de saisie', 'Annulée']),
      ...sales.map((s) => [
        stamp(s.sold_at),
        s.markets?.name || '',
        s.variants?.creations?.name || '',
        s.variants?.yarns?.color || '',
        s.quantity,
        Number(s.unit_price),
        s.unit_cost === null ? null : Number(s.unit_cost),
        s.entry_mode === 'remaining_count' ? 'Décompte' : 'Directe',
        yesNo(!!s.cancelled_at),
      ]),
    ],
  }

  const sheetMovements = {
    sheet: 'Mouvements de stock',
    columns: [{ width: 18 }, { width: 32 }, { width: 20 }, { width: 22 }, { width: 12 }, { width: 40 }],
    data: [
      head(['Date et heure', 'Création', 'Couleur', 'Type', 'Variation', 'Note']),
      ...movements.map((m) => [
        stamp(m.created_at),
        m.variants?.creations?.name || '',
        m.variants?.yarns?.color || '',
        MOVEMENT_LABELS[m.movement_type] || m.movement_type,
        m.quantity_change,
        cell(m.note),
      ]),
    ],
  }

  return [sheetCreations, sheetVariants, sheetYarns, sheetMarkets, sheetSales, sheetMovements]
}
