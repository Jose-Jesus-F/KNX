const BASE = '/api'

async function get(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export function fetchApartments() {
  return get(`${BASE}/apartments`)
}

export function fetchReadings(apartmentId, { from, to, granularity = 'hour' } = {}) {
  const p = new URLSearchParams({ granularity })
  if (from) p.set('from', from)
  if (to)   p.set('to',   to)
  return get(`${BASE}/apartments/${apartmentId}/readings?${p}`)
}

export function fetchSummary({ from, to } = {}) {
  const p = new URLSearchParams()
  if (from) p.set('from', from)
  if (to)   p.set('to',   to)
  return get(`${BASE}/summary?${p}`)
}
