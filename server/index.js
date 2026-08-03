const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
}

// ── Apartments ──────────────────────────────────────────────────────────────

app.get('/api/apartments', (_req, res) => {
  const rows = db.prepare(`
    SELECT
      a.*,
      rl.kwh_total,
      rl.power_w,
      rl.timestamp                                           AS last_reading,
      rl.kwh_total - COALESCE(rm.kwh_total, rl.kwh_total)  AS kwh_today
    FROM apartments a
    LEFT JOIN readings rl ON rl.id = (
      SELECT id FROM readings WHERE apartment_id = a.id
      ORDER BY timestamp DESC LIMIT 1
    )
    LEFT JOIN readings rm ON rm.id = (
      SELECT id FROM readings
      WHERE apartment_id = a.id
        AND timestamp <= date('now', 'localtime') || 'T00:00:00.000Z'
      ORDER BY timestamp DESC LIMIT 1
    )
    ORDER BY a.id
  `).all();
  res.json(rows);
});

// ── Readings for one apartment ───────────────────────────────────────────────

app.get('/api/apartments/:id/readings', (req, res) => {
  const { from, to, granularity = 'hour' } = req.query;

  const aptId = Number(req.params.id);

  const groupFormats = {
    hour:  "strftime('%Y-%m-%dT%H:00:00', timestamp)",
    day:   "date(timestamp)",
    month: "strftime('%Y-%m', timestamp)",
  };
  const fmt = groupFormats[granularity] || groupFormats.hour;

  // Use LAG window function so each row's delta = kwh_total - previous reading.
  // Fetch one extra reading before 'from' to correctly compute the first delta.
  const extraParams = [aptId];
  let extraFilter = '';
  if (from) { extraFilter += ' AND timestamp >= ?'; extraParams.push(from); }
  if (to)   { extraFilter += ' AND timestamp <= ?'; extraParams.push(to);   }

  const rows = db.prepare(`
    WITH deltas AS (
      SELECT
        timestamp,
        power_w,
        ${fmt} AS period,
        COALESCE(
          kwh_total - LAG(kwh_total) OVER (ORDER BY timestamp),
          0
        ) AS kwh_delta
      FROM readings
      WHERE apartment_id = ? ${extraFilter}
    )
    SELECT
      period,
      SUM(CASE WHEN kwh_delta > 0 THEN kwh_delta ELSE 0 END) AS kwh_consumed,
      AVG(power_w)  AS avg_power_w,
      MAX(power_w)  AS max_power_w
    FROM deltas
    GROUP BY period
    ORDER BY period
  `).all(...extraParams);

  res.json(rows);
});

// ── Cross-apartment summary ──────────────────────────────────────────────────

app.get('/api/summary', (req, res) => {
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  const from = req.query.from || defaultFrom.toISOString();
  const to   = req.query.to   || new Date().toISOString();

  const rows = db.prepare(`
    SELECT
      a.id,
      a.name,
      MAX(r.kwh_total) - MIN(r.kwh_total) AS kwh_consumed,
      AVG(r.power_w)                      AS avg_power_w,
      MAX(r.power_w)                      AS max_power_w,
      COUNT(r.id)                         AS reading_count
    FROM apartments a
    LEFT JOIN readings r
      ON r.apartment_id = a.id
     AND r.timestamp >= ? AND r.timestamp <= ?
    GROUP BY a.id
    ORDER BY a.id
  `).all(from, to);

  res.json(rows);
});

// ── Ingest endpoint (called by the meter-collection server) ──────────────────

app.post('/api/readings', (req, res) => {
  const { meter_id, kwh_total, power_w, timestamp } = req.body;

  if (!meter_id || kwh_total === undefined) {
    return res.status(400).json({ error: 'meter_id and kwh_total are required' });
  }

  const apt = db.prepare('SELECT id FROM apartments WHERE meter_id = ?').get(meter_id);
  if (!apt) return res.status(404).json({ error: `No apartment found for meter_id "${meter_id}"` });

  const ts = timestamp || new Date().toISOString();

  db.prepare(`
    INSERT OR REPLACE INTO readings (apartment_id, timestamp, kwh_total, power_w)
    VALUES (?, ?, ?, ?)
  `).run(apt.id, ts, kwh_total, power_w ?? null);

  res.json({ success: true });
});

// ── Batch ingest ─────────────────────────────────────────────────────────────

app.post('/api/readings/batch', (req, res) => {
  const { readings } = req.body;
  if (!Array.isArray(readings) || readings.length === 0) {
    return res.status(400).json({ error: 'readings array is required' });
  }

  const insertOne = db.prepare(`
    INSERT OR REPLACE INTO readings (apartment_id, timestamp, kwh_total, power_w)
    VALUES (?, ?, ?, ?)
  `);
  const getApt = db.prepare('SELECT id FROM apartments WHERE meter_id = ?');

  let inserted = 0;
  const errors = [];

  db.exec('BEGIN')
  try {
    for (const r of readings) {
      const apt = getApt.get(r.meter_id);
      if (!apt) { errors.push(`Unknown meter_id: ${r.meter_id}`); continue; }
      insertOne.run(apt.id, r.timestamp || new Date().toISOString(), r.kwh_total, r.power_w ?? null);
      inserted++;
    }
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    return res.status(500).json({ error: e.message })
  }
  res.json({ inserted, errors });
});

// ── Production fallback ──────────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`API server → http://localhost:${PORT}`);
});
