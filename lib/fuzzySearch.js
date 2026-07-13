// Typo-tolerant player search. Strategy: run the exact substring match first;
// if it comes up short, split the query into words and match each word
// independently (so "Matias Albert" still finds "Mathis Albert" via the
// surname), then rank everything by bigram similarity to the full query.

export function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Dice coefficient on character bigrams — cheap and good for name typos.
export function similarity(a, b) {
  a = normalizeName(a); b = normalizeName(b)
  if (!a.length || !b.length) return 0
  if (a === b) return 1
  const grams = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1) } return m }
  const ga = grams(a), gb = grams(b)
  let hits = 0
  for (const [g, n] of ga) if (gb.has(g)) hits += Math.min(n, gb.get(g))
  return (2 * hits) / (a.length - 1 + b.length - 1)
}

// Returns rows from `table` matching `term` on `nameCol`, typo-tolerant.
// `applyFilter` (optional) lets callers add query constraints, e.g. a version.
export async function fuzzyPlayerSearch(supabase, table, nameCol, term, limit, applyFilter) {
  const base = () => {
    let q = supabase.from(table).select('*')
    if (applyFilter) q = applyFilter(q)
    return q
  }
  const exact = await base().ilike(nameCol, '%' + term + '%').limit(limit)
  let rows = exact.error ? [] : (exact.data || [])

  if (rows.length < 3) {
    const words = term.trim().split(/\s+/).filter((w) => w.length >= 3)
    if (words.length > 0) {
      const ors = words.map((w) => nameCol + '.ilike.%' + w + '%').join(',')
      const wide = await base().or(ors).limit(60)
      if (!wide.error && wide.data) {
        const seen = new Set(rows.map((r) => r.id))
        rows = rows.concat(wide.data.filter((r) => !seen.has(r.id)))
      }
    }
  }

  return rows
    .map((r) => ({ r, score: similarity(term, r[nameCol]) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.r)
}
