const POWER_LEVELS = [
  { max: 200,   label: 'Mínimo',   dot: 'bg-gray-300',   text: 'text-gray-400'   },
  { max: 800,   label: 'Bajo',     dot: 'bg-green-400',  text: 'text-green-600'  },
  { max: 2000,  label: 'Medio',    dot: 'bg-yellow-400', text: 'text-yellow-600' },
  { max: 4000,  label: 'Alto',     dot: 'bg-orange-400', text: 'text-orange-600' },
  { max: Infinity, label: 'Muy alto', dot: 'bg-red-500', text: 'text-red-600'    },
]

function powerLevel(w) {
  return POWER_LEVELS.find(l => (w ?? 0) < l.max)
}

function fmtPower(w) {
  if (!w) return '—'
  return w >= 1000 ? `${(w / 1000).toFixed(2)} kW` : `${Math.round(w)} W`
}

function fmtKwh(kwh) {
  if (kwh == null) return '—'
  return `${kwh.toFixed(2)} kWh`
}

export default function ApartmentCard({ apartment, onClick }) {
  const { name, floor, power_w, kwh_today, last_reading } = apartment
  const level    = powerLevel(power_w)
  const hasData  = power_w != null

  const lastTs = last_reading
    ? new Date(last_reading).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-100
                 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5
                 transition-all duration-150 p-4 flex flex-col gap-2"
    >
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{name}</p>
          <p className="text-xs text-gray-400">{floor}</p>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
          ${hasData ? level.text + ' bg-opacity-10' : 'text-gray-400'}`}>
          <span className={`w-2 h-2 rounded-full ${level.dot}`} />
          {hasData ? level.label : 'Sin datos'}
        </span>
      </div>

      {/* Power reading */}
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">
          {fmtPower(power_w)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Potencia actual</p>
      </div>

      {/* Today kWh */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        <span className="text-xs text-gray-400">Hoy</span>
        <span className="text-xs font-semibold text-gray-700">
          {fmtKwh(kwh_today)}
        </span>
      </div>

      {lastTs && (
        <p className="text-xs text-gray-300">Últ. lectura {lastTs}</p>
      )}
    </button>
  )
}
