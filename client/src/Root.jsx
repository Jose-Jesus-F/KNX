import App from './App.jsx'
import BattleshipGame from './games/battleship/BattleshipGame.jsx'

export default function Root() {
  const path = window.location.pathname
  if (path === '/juego') {
    return <BattleshipGame />
  }
  return <App />
}
