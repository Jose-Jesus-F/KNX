import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import ApartmentCard from './ApartmentCard'
import { fetchSummary } from '../api'
import { useEffect } from 'react'

const APT_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#84cc16','#f97316','#ec4899','#6366f1',
]

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function fmtPower(w) {
  if (!w) return '—'
  return w >= 1000 ? `${(w / 1000).toFixed(2)} kW` : `${Math.round(w)} W`
}

export default function Dashboard({ apartments, lastUpdated, onSelect, onRefresh }) {
  const [summary, setSummary] = useState([])

  useEffect(() => {
    fetchSummary().then(setSummary).catch(() => {})
  }, [apartments]) // refresh summary when apartments refresh

  const totalPower   = apartments.reduce((s, a) => s + (a.power_w || 0), 0)
  const activeCount  = apartments.filter(a => (a.power_w || 0) > 50).length
  const topConsumer  = [...apartments].sort((a, b) => (b.power_w || 0) - (a.power_w || 0))[0]

  const updatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  // Comparison chart data (30-day kWh)
  const chartData = summary.map((s, i) => ({
    name:  `Apt ${s.id}`,
    kwh:   s.kwh_consumed ? Math.round(s.kwh_consumed * 10) / 10 : 0,
    color: APT_COLORS[i % APT_COLORS.length],
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⚡ Monitor Eléctrico</h1>
          <p className="text-sm text-gray-400 mt-1">
            10 apartamentos · actualización automática
            {lastUpdated && <> · actualizado {updatedStr}</>}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg
                     hover:bg-gray-50 transition-colors shadow-sm font-medium text-gray-700"
        >
          Actualizar
        </button>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Potencia total ahora"
          value={fmtPower(totalPower)}
          sub="suma de todos los contadores"
        />
        <StatCard
          label="Apartamentos activos"
          value={`${activeCount} / 10`}
          sub="con consumo > 50 W"
        />
        <StatCard
          label="Mayor consumidor"
          value={topConsumer?.name ?? '—'}
          sub={topConsumer ? fmtPower(topConsumer.power_w) : ''}
        />
      </div>

      {/* ── Comparison chart ── */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
          <p className="text-sm font-semibold text-gray-700 mb-4">
            Consumo últimos 30 días por apartamento (kWh)
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={24}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit=" kWh" width={65} />
              <Tooltip
                formatter={v => [`${v} kWh`, 'Consumo']}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="kwh" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Apartment grid ── */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Apartamentos
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {apartments.map(apt => (
          <ApartmentCard key={apt.id} apartment={apt} onClick={() => onSelect(apt.id)} />
        ))}
      </div>
    </div>
  )
}
