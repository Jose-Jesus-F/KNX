import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

function fmtXAxis(period, granularity) {
  if (!period) return ''
  const d = new Date(period)
  if (granularity === 'month') {
    return d.toLocaleDateString('es', { month: 'short', year: '2-digit' })
  }
  if (granularity === 'day') {
    return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit' })
  }
  // hour
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function fmtTooltipLabel(period, granularity) {
  if (!period) return ''
  const d = new Date(period)
  if (granularity === 'month') {
    return d.toLocaleDateString('es', { month: 'long', year: 'numeric' })
  }
  if (granularity === 'day') {
    return d.toLocaleDateString('es', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  }
  return d.toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ConsumptionChart({ data, granularity, color = '#3b82f6' }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        No hay datos para el período seleccionado
      </div>
    )
  }

  const avg = data.reduce((s, d) => s + (d.kwh_consumed || 0), 0) / data.length

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="period"
          tickFormatter={v => fmtXAxis(v, granularity)}
          tick={{ fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          unit=" kWh"
          width={72}
          tickFormatter={v => v.toFixed(2)}
        />
        <Tooltip
          labelFormatter={v => fmtTooltipLabel(v, granularity)}
          formatter={(v, name) => {
            if (name === 'kwh_consumed') return [`${v.toFixed(3)} kWh`, 'Consumo']
            if (name === 'max_power_w')  return [`${Math.round(v)} W`,  'Pico']
            return [v, name]
          }}
          contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
        />
        <ReferenceLine
          y={avg}
          stroke={color}
          strokeDasharray="4 4"
          strokeOpacity={0.5}
          label={{ value: 'Media', position: 'right', fontSize: 10, fill: color }}
        />
        <Area
          type="monotone"
          dataKey="kwh_consumed"
          stroke={color}
          strokeWidth={2}
          fill="url(#grad)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
