export const BOARD_SIZE = 10

export const FLEET = [
  { length: 4, name: 'Portaaviones', count: 1 },
  { length: 3, name: 'Acorazado',    count: 2 },
  { length: 2, name: 'Destructor',   count: 3 },
  { length: 1, name: 'Submarino',    count: 4 },
]

function emptyCells(size) {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ shipId: null, attacked: false }))
  )
}

function neighbors(r, c) {
  const out = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      out.push([r + dr, c + dc])
    }
  }
  return out
}

function canPlace(cells, size, cellsToOccupy) {
  for (const [r, c] of cellsToOccupy) {
    if (r < 0 || r >= size || c < 0 || c >= size) return false
    for (const [nr, nc] of neighbors(r, c)) {
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
      if (cells[nr][nc].shipId !== null) return false
    }
  }
  return true
}

export function placeFleetRandomly(size = BOARD_SIZE) {
  const cells = emptyCells(size)
  const ships = []
  let nextId = 1

  const lengths = FLEET.flatMap(({ length, count }) => Array(count).fill(length))
    .sort((a, b) => b - a)

  for (const length of lengths) {
    let placed = false
    let attempts = 0
    while (!placed && attempts < 500) {
      attempts++
      const horizontal = Math.random() < 0.5
      const row = Math.floor(Math.random() * size)
      const col = Math.floor(Math.random() * size)
      const shipCells = []
      for (let i = 0; i < length; i++) {
        shipCells.push(horizontal ? [row, col + i] : [row + i, col])
      }
      if (!canPlace(cells, size, shipCells)) continue

      const id = nextId++
      shipCells.forEach(([r, c]) => { cells[r][c].shipId = id })
      ships.push({ id, length, cells: shipCells, hits: 0, sunk: false })
      placed = true
    }
    if (!placed) {
      throw new Error('No se pudo colocar la flota, reintentando')
    }
  }

  return { size, cells, ships }
}

export function createBoard(size = BOARD_SIZE) {
  let attempts = 0
  while (attempts < 20) {
    try {
      return placeFleetRandomly(size)
    } catch {
      attempts++
    }
  }
  throw new Error('No se pudo generar el tablero')
}

// Returns a new board (immutable) plus the outcome of the shot.
export function attack(board, r, c) {
  const cell = board.cells[r][c]
  if (cell.attacked) {
    return { board, alreadyAttacked: true, hit: false, sunk: false, shipName: null }
  }

  const cells = board.cells.map(row => row.map(cl => ({ ...cl })))
  cells[r][c].attacked = true

  let ships = board.ships
  let hit = false
  let sunk = false
  let shipName = null

  if (cell.shipId !== null) {
    hit = true
    ships = board.ships.map(ship => {
      if (ship.id !== cell.shipId) return ship
      const hits = ship.hits + 1
      const isSunk = hits >= ship.length
      if (isSunk) sunk = true
      return { ...ship, hits, sunk: isSunk }
    })
    const shipMeta = FLEET.find(f => f.length === board.ships.find(s => s.id === cell.shipId).length)
    shipName = shipMeta?.name ?? 'Barco'
  }

  const allSunk = ships.every(s => s.sunk)

  return {
    board: { ...board, cells, ships },
    alreadyAttacked: false,
    hit,
    sunk,
    shipName,
    allSunk,
  }
}

export function pickCpuTarget(board, aiState) {
  const { size, cells } = board

  while (aiState.queue.length) {
    const next = aiState.queue.shift()
    const [r, c] = next
    if (!cells[r][c].attacked) return next
  }

  const candidates = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!cells[r][c].attacked) candidates.push([r, c])
    }
  }
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function updateCpuAiState(aiState, board, r, c, hit, sunk) {
  if (sunk) {
    aiState.queue = []
    return
  }
  if (hit) {
    const { size, cells } = board
    const adj = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
    for (const [nr, nc] of adj) {
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
      if (cells[nr][nc].attacked) continue
      aiState.queue.push([nr, nc])
    }
  }
}
