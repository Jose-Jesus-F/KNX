import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BOARD_SIZE,
  createBoard,
  attack,
  pickCpuTarget,
  updateCpuAiState,
} from './logic'

function newGameState() {
  return {
    playerBoard: createBoard(),
    cpuBoard: createBoard(),
    turn: 'player',
    message: 'Tu turno: dispara sobre el mar enemigo.',
    winner: null,
  }
}

function Grid({ board, ownBoard, onCellClick, disabled }) {
  return (
    <div
      className="grid gap-[2px] bg-blue-950 p-2 rounded-lg select-none"
      style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
    >
      {board.cells.map((row, r) =>
        row.map((cell, c) => {
          const showShip = ownBoard && cell.shipId !== null
          const isHit = cell.attacked && cell.shipId !== null
          const isMiss = cell.attacked && cell.shipId === null

          let classes = 'aspect-square w-7 sm:w-8 rounded-sm flex items-center justify-center text-xs transition-colors '
          if (isHit) classes += 'bg-red-600 text-white font-bold'
          else if (isMiss) classes += 'bg-blue-800 text-blue-300'
          else if (showShip) classes += 'bg-gray-400'
          else classes += 'bg-blue-600 hover:bg-blue-500'

          const clickable = !ownBoard && !cell.attacked && !disabled

          return (
            <button
              key={`${r}-${c}`}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onCellClick(r, c)}
              className={classes + (clickable ? ' cursor-pointer' : ' cursor-default')}
            >
              {isHit ? '✕' : isMiss ? '·' : ''}
            </button>
          )
        })
      )}
    </div>
  )
}

export default function BattleshipGame() {
  const [game, setGame] = useState(newGameState)
  const aiState = useRef({ queue: [] })

  const resetGame = useCallback(() => {
    aiState.current = { queue: [] }
    setGame(newGameState())
  }, [])

  const playerShoot = useCallback((r, c) => {
    setGame(prev => {
      if (prev.turn !== 'player' || prev.winner) return prev
      const result = attack(prev.cpuBoard, r, c)
      if (result.alreadyAttacked) return prev

      let message
      if (result.sunk) message = `¡Hundiste su ${result.shipName}!`
      else if (result.hit) message = '¡Tocado!'
      else message = 'Agua.'

      if (result.allSunk) {
        return { ...prev, cpuBoard: result.board, winner: 'player', message: '¡Has hundido toda la flota enemiga! Victoria 🎉' }
      }

      return { ...prev, cpuBoard: result.board, turn: 'cpu', message }
    })
  }, [])

  // CPU turn
  useEffect(() => {
    if (game.turn !== 'cpu' || game.winner) return
    const timer = setTimeout(() => {
      setGame(prev => {
        if (prev.turn !== 'cpu' || prev.winner) return prev
        const [r, c] = pickCpuTarget(prev.playerBoard, aiState.current)
        const result = attack(prev.playerBoard, r, c)
        updateCpuAiState(aiState.current, result.board, r, c, result.hit, result.sunk)

        let message
        if (result.sunk) message = `La CPU ha hundido tu ${result.shipName}.`
        else if (result.hit) message = 'La CPU te ha tocado.'
        else message = 'La CPU ha disparado al agua.'

        if (result.allSunk) {
          return { ...prev, playerBoard: result.board, winner: 'cpu', message: 'La CPU ha hundido tu flota. Has perdido 💥' }
        }

        return { ...prev, playerBoard: result.board, turn: 'player', message }
      })
    }, 600)
    return () => clearTimeout(timer)
  }, [game.turn, game.winner])

  return (
    <div className="min-h-screen bg-blue-950 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">🚢 Hundir la Flota</h1>
            <a href="/" className="text-sm text-blue-300 hover:text-blue-100 underline">
              ← Volver al monitor eléctrico
            </a>
          </div>
          <button
            onClick={resetGame}
            className="px-4 py-2 text-sm bg-blue-800 border border-blue-700 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Nueva partida
          </button>
        </div>

        <div
          className={
            'mb-6 px-4 py-3 rounded-lg text-sm font-medium ' +
            (game.winner === 'player'
              ? 'bg-green-700'
              : game.winner === 'cpu'
              ? 'bg-red-800'
              : 'bg-blue-900')
          }
        >
          {game.message}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-sm uppercase tracking-wide text-blue-300 mb-2">Flota enemiga</h2>
            <Grid
              board={game.cpuBoard}
              ownBoard={false}
              onCellClick={playerShoot}
              disabled={game.turn !== 'player' || !!game.winner}
            />
          </div>
          <div>
            <h2 className="text-sm uppercase tracking-wide text-blue-300 mb-2">Tu flota</h2>
            <Grid board={game.playerBoard} ownBoard={true} onCellClick={() => {}} disabled />
          </div>
        </div>
      </div>
    </div>
  )
}
