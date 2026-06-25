import { useState, useEffect } from 'react'
import ConsumptionChart from './ConsumptionChart'
import { fetchReadings }  from '../api'

const RANGES = [
  { label: 'Hoy',     days: 0,  gran: 'hour'  },
  { label: '7 días',  days: 7,  gran: 'hour'  },
  { label: '30 días', days: 30, gran: 'day'   },
  { label: '3 meses', days: 90, gran: 'month' },
]

const APT_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#84cc16','#f97316','#ec4899','#6366f1',
]

function isoFrom(days) {
  const d = new Date()
  if (days === 0) {
    d.setHours(0, 0, 0, 0)
  } else {
    d.setDate(d.getDate() - days)
    d.setHours(0, 0, 0, 0)
  }
  return d.toISOString()
}

function fmtPower(w) {
  if (w == null) return '—'
  return w >= 1000 ? `${(w / 1000).toFixed(2)} kW` : `${Math.round(w)} W`
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
    </div>
  )
}

export default function ApartmentDetail({ apartment, onBack }) {
  const [readings,    setReadings]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [rangeIdx,    setRangeIdx]    = useState(1) // default: 7 días
  const [granularity, setGranularity] = useState(RANGES[1].gran)

  const range = RANGES[rangeIdx]
  const color = APT_COLORS[(apartment?.id ?? 1) - 1]

  useEffect(() => {
    if (!apartment) return
    setLoading(true)
    fetchReadings(apartment.id, {
      from:        isoFrom(range.days),
      to:          new Date().toISOString(),
      granularity,
    })
      .then(data => { setReadings(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [apartment?.id, rangeIdx, granularity])

  if (!apartment) return null

  // Stats derived from readings
  const totalKwh = readings.reduce((s, r) => s + (r.kwh_consumed || 0), 0)
  const avgPower  = readings.reduce((s, r) => s + (r.avg_power_w || 0), 0) / (readings.length || 1)
  const peakPower = Math.max(...readings.map(r => r.max_power_w || 0), 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* ── Header / breadcrumb ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Dashboard
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-700">{apartment.name}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{apartment.name}</h1>
          <p className="text-sm text-gray-400">{apartment.floor} · Contador: {apartment.meter_id}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold" style={{ color }}>
            {fmtPower(apartment.power_w)}
          </p>
          <p className="text-xs text-gray-400">Potencia actual</p>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total período"   value={`${totalKwh.toFixed(2)} kWh`} />
        <StatCard label="Media potencia"  value={fmtPower(avgPower)} />
        <StatCard label="Pico potencia"   value={fmtPower(peakPower)} />
        <StatCard label="Lecturas"        value={readings.length} />
      </div>

      {/* ── Chart controls ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">

          {/* Range selector */}
          <div className="flex gap-1">
            {RANGES.map((r, idx) => (
              <button
                key={r.label}
                onClick={() => { setRangeIdx(idx); setGranularity(r.gran) }}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  rangeIdx === idx
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={rangeIdx === idx ? { backgroundColor: color } : {}}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Granularity selector */}
          <div className="flex gap-1 text-xs">
            {['hour', 'day', 'month'].map(g => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  granularity === g
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {{ hour: 'Hora', day: 'Día', month: 'Mes' }[g]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
                 style={{ borderColor: color, borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <ConsumptionChart data={readings} granularity={granularity} color={color} />
        )}
      </div>

      {/* ── Raw data table (last 20 rows) ── */}
      {readings.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <p className="text-sm font-semibold text-gray-700 px-5 py-3 border-b border-gray-100">
            Últimas lecturas del período
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left">Período</th>
                  <th className="px-4 py-2 text-right">Consumo</th>
                  <th className="px-4 py-2 text-right">Media W</th>
                  <th className="px-4 py-2 text-right">Pico W</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...readings].reverse().slice(0, 20).map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 text-gray-600 font-mono">
                      {new Date(r.period).toLocaleString('es', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: granularity === 'hour' ? '2-digit' : undefined,
                        minute: granularity === 'hour' ? '2-digit' : undefined,
                      })}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-900">
                      {r.kwh_consumed?.toFixed(3)} kWh
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500">
                      {r.avg_power_w ? Math.round(r.avg_power_w) + ' W' : '—'}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500">
                      {r.max_power_w ? Math.round(r.max_power_w) + ' W' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
