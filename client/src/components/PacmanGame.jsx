import { useEffect, useRef, useState } from 'react'

// 0 = pared, 1 = punto, 2 = vacío (ya comido / camino), 3 = power pellet
const RAW_MAP = [
  '0000000000000000000',
  '0311111111111111130',
  '0100111100011110010',
  '0100111100011110010',
  '0111111111111111110',
  '0100100111110010010',
  '0100100111110010010',
  '0111100101010011110',
  '0111111101111111110',
  '1111111101111111111',
  '0111111111111111110',
  '0111100111110011110',
  '0100100111110010010',
  '0100100111110010010',
  '0111111100011111110',
  '0100111100011110010',
  '0300111111111110030',
  '0000000000000000000',
]

const CELL = 20
const COLS = RAW_MAP[0].length
const ROWS = RAW_MAP.length

const DIRS = {
  ArrowUp:    [0, -1],
  ArrowDown:  [0, 1],
  ArrowLeft:  [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
}

function parseMap() {
  const grid = RAW_MAP.map(row => row.split('').map(Number))
  let dots = 0
  grid.forEach(row => row.forEach(v => { if (v === 1 || v === 3) dots++ }))
  return { grid, dots }
}

const GHOST_COLORS = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852']
const GHOST_START = [
  { x: 9, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 9 }, { x: 10, y: 9 },
]

export default function PacmanGame({ onBack }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [status, setStatus] = useState('playing') // playing | won | lost

  useEffect(() => {
    const { grid, dots } = parseMap()
    stateRef.current = {
      grid,
      dotsLeft: dots,
      pacman: { x: 9, y: 13, dir: [0, 0], nextDir: [0, 0] },
      ghosts: GHOST_START.map((p, i) => ({
        x: p.x, y: p.y, dir: [1, 0], color: GHOST_COLORS[i], scared: false,
      })),
      score: 0,
      lives: 3,
      frightenedTimer: 0,
      grace: 15,
      status: 'playing',
    }
    setScore(0)
    setLives(3)
    setStatus('playing')

    const handleKey = e => {
      const d = DIRS[e.key]
      if (d) {
        e.preventDefault()
        stateRef.current.pacman.nextDir = d
      }
    }
    window.addEventListener('keydown', handleKey)

    const canPass = (x, y) => {
      const wrapped = ((x % COLS) + COLS) % COLS
      if (y < 0 || y >= ROWS) return false
      return grid[y][wrapped] !== 0
    }

    let raf
    let last = 0
    const STEP_MS = 160

    const tick = ts => {
      raf = requestAnimationFrame(tick)
      if (ts - last < STEP_MS) return
      last = ts
      const st = stateRef.current
      if (st.status !== 'playing') return

      const p = st.pacman
      if (canPass(p.x + p.nextDir[0], p.y + p.nextDir[1])) {
        p.dir = p.nextDir
      }
      if (canPass(p.x + p.dir[0], p.y + p.dir[1])) {
        p.x = ((p.x + p.dir[0]) % COLS + COLS) % COLS
        p.y = p.y + p.dir[1]
      }

      const cell = grid[p.y][p.x]
      if (cell === 1) {
        grid[p.y][p.x] = 2
        st.score += 10
        st.dotsLeft--
      } else if (cell === 3) {
        grid[p.y][p.x] = 2
        st.score += 50
        st.dotsLeft--
        st.frightenedTimer = 30
        st.ghosts.forEach(g => { g.scared = true })
      }

      if (st.frightenedTimer > 0) {
        st.frightenedTimer--
        if (st.frightenedTimer === 0) st.ghosts.forEach(g => { g.scared = false })
      }

      if (st.grace > 0) {
        st.grace--
      } else {
        st.ghosts.forEach(g => {
          const allMoves = [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(d => canPass(g.x + d[0], g.y + d[1]))
          const forwardMoves = allMoves.filter(d => !(d[0] === -g.dir[0] && d[1] === -g.dir[1]))
          const options = forwardMoves.length ? forwardMoves : allMoves
          const choices = options.length ? options : [[-g.dir[0], -g.dir[1]]]
          // el fantasma no siempre elige el camino óptimo, para dar margen al jugador
          if (choices.length > 1 && Math.random() < 0.35) {
            g.dir = choices[Math.floor(Math.random() * choices.length)]
          } else {
            choices.sort((a, b) => {
              const da = Math.hypot((g.x + a[0]) - p.x, (g.y + a[1]) - p.y)
              const db = Math.hypot((g.x + b[0]) - p.x, (g.y + b[1]) - p.y)
              return g.scared ? db - da : da - db
            })
            g.dir = choices[0]
          }
          g.x = ((g.x + g.dir[0]) % COLS + COLS) % COLS
          g.y = g.y + g.dir[1]
        })
      }

      st.ghosts.forEach(g => {
        if (g.x === p.x && g.y === p.y) {
          if (g.scared) {
            g.x = 9; g.y = 8; g.scared = false
            st.score += 200
          } else {
            st.lives--
            p.x = 9; p.y = 13; p.dir = [0, 0]; p.nextDir = [0, 0]
            st.ghosts.forEach((gg, i) => { gg.x = GHOST_START[i].x; gg.y = GHOST_START[i].y })
            st.grace = 15
            if (st.lives <= 0) st.status = 'lost'
          }
        }
      })

      if (st.dotsLeft <= 0) st.status = 'won'

      setScore(st.score)
      setLives(st.lives)
      if (st.status !== 'playing') setStatus(st.status)

      draw()
    }

    const draw = () => {
      const ctx = canvasRef.current.getContext('2d')
      const st = stateRef.current
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL)

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const v = grid[y][x]
          if (v === 0) {
            ctx.fillStyle = '#1e3a8a'
            ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
          } else if (v === 1) {
            ctx.fillStyle = '#fbbf24'
            ctx.beginPath()
            ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 2.5, 0, Math.PI * 2)
            ctx.fill()
          } else if (v === 3) {
            ctx.fillStyle = '#fbbf24'
            ctx.beginPath()
            ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 6, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      const p = st.pacman
      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      const angle = p.dir[0] === -1 ? Math.PI : p.dir[1] === -1 ? -Math.PI / 2 : p.dir[1] === 1 ? Math.PI / 2 : 0
      ctx.arc(p.x * CELL + CELL / 2, p.y * CELL + CELL / 2, CELL / 2 - 2, angle + 0.25 * Math.PI, angle + 1.75 * Math.PI)
      ctx.lineTo(p.x * CELL + CELL / 2, p.y * CELL + CELL / 2)
      ctx.fill()

      st.ghosts.forEach(g => {
        ctx.fillStyle = g.scared ? '#2563eb' : g.color
        ctx.beginPath()
        ctx.arc(g.x * CELL + CELL / 2, g.y * CELL + CELL / 2 - 2, CELL / 2 - 2, Math.PI, 0)
        ctx.lineTo(g.x * CELL + CELL - 2, g.y * CELL + CELL)
        ctx.lineTo(g.x * CELL + 2, g.y * CELL + CELL)
        ctx.closePath()
        ctx.fill()
      })
    }

    draw()
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', handleKey)
    }
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">🟡 Comecocos</h1>
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg
                     hover:bg-gray-50 transition-colors shadow-sm font-medium text-gray-700"
        >
          Volver al monitor
        </button>
      </div>

      <div className="flex items-center gap-6 mb-4 text-sm font-medium text-gray-700">
        <span>Puntos: {score}</span>
        <span>Vidas: {'❤️'.repeat(Math.max(lives, 0))}</span>
        <span className="text-gray-400">Muévete con las flechas o WASD</span>
      </div>

      <div className="relative inline-block rounded-lg overflow-hidden shadow-lg border border-gray-800">
        <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} />
        {status !== 'playing' && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <p className="text-white text-xl font-bold">
              {status === 'won' ? '¡Has ganado! 🎉' : 'Game over 💀'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
