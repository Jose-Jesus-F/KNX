// Populates the DB with 10 apartments and 90 days of hourly demo readings.
// Run once: node server/seed.js

const db = require('./db')

const APARTMENTS = Array.from({ length: 10 }, (_, i) => ({
  id:       i + 1,
  name:     `Apartamento ${i + 1}`,
  floor:    `Planta ${Math.ceil((i + 1) / 2)}`,
  meter_id: `METER-${String(i + 1).padStart(3, '0')}`,
}))

const insertApt = db.prepare(
  'INSERT OR IGNORE INTO apartments (id, name, floor, meter_id) VALUES (?, ?, ?, ?)'
)
for (const a of APARTMENTS) {
  insertApt.run(a.id, a.name, a.floor, a.meter_id)
}

const BASE_KWH = [1000, 1200, 800, 1500, 900, 1100, 750, 1300, 1050, 1400]

const insertReading = db.prepare(
  'INSERT OR IGNORE INTO readings (apartment_id, timestamp, kwh_total, power_w) VALUES (?, ?, ?, ?)'
)

const DAYS = 90
const now  = new Date()

db.exec('BEGIN')
try {
  for (let apt = 0; apt < 10; apt++) {
    let total   = BASE_KWH[apt]
    const baseW = 300 + apt * 80

    for (let d = DAYS; d >= 0; d--) {
      for (let h = 0; h < 24; h++) {
        const ts = new Date(now)
        ts.setDate(ts.getDate() - d)
        ts.setHours(h, 0, 0, 0)

        const daytime   = h >= 7 && h <= 22
        const hourFactor = daytime ? 1.6 : 0.25
        const dayOfWeek  = ts.getDay()
        const weekFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.2 : 1.0
        const jitter     = 0.7 + Math.random() * 0.6

        const powerW = baseW * hourFactor * weekFactor * jitter
        total += powerW / 1000

        insertReading.run(
          apt + 1,
          ts.toISOString(),
          Math.round(total * 100) / 100,
          Math.round(powerW)
        )
      }
    }
  }
  db.exec('COMMIT')
} catch (e) {
  db.exec('ROLLBACK')
  throw e
}

const count = db.prepare('SELECT COUNT(*) AS n FROM readings').get()
console.log(`Seed done: ${count.n} readings para 10 apartamentos`)
