const { DatabaseSync } = require('node:sqlite')
const path = require('path')
const fs   = require('fs')

const DB_PATH = path.join(__dirname, '..', 'data', 'electricity.db')
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const db = new DatabaseSync(DB_PATH)

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS apartments (
    id       INTEGER PRIMARY KEY,
    name     TEXT    NOT NULL,
    floor    TEXT,
    meter_id TEXT    UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS readings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    timestamp    TEXT    NOT NULL,
    kwh_total    REAL    NOT NULL,
    power_w      REAL,
    UNIQUE(apartment_id, timestamp)
  );

  CREATE INDEX IF NOT EXISTS idx_readings_apt_ts
    ON readings(apartment_id, timestamp);
`)

module.exports = db
