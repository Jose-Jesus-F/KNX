import { useState, useEffect, useCallback } from 'react'
import Dashboard       from './components/Dashboard'
import ApartmentDetail from './components/ApartmentDetail'
import PacmanGame       from './components/PacmanGame'
import { fetchApartments } from './api'

export default function App() {
  const [apartments,   setApartments]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [selectedId,   setSelectedId]   = useState(null)
  const [lastUpdated,  setLastUpdated]  = useState(null)
  const [showGame,     setShowGame]     = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await fetchApartments()
      setApartments(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando datos…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white rounded-xl p-8 shadow-sm border border-red-100">
          <p className="text-red-500 font-medium mb-1">No se pudo conectar al servidor</p>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={load}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showGame ? (
        <PacmanGame onBack={() => setShowGame(false)} />
      ) : selectedId ? (
        <ApartmentDetail
          apartment={apartments.find(a => a.id === selectedId)}
          onBack={() => setSelectedId(null)}
        />
      ) : (
        <Dashboard
          apartments={apartments}
          lastUpdated={lastUpdated}
          onSelect={setSelectedId}
          onRefresh={load}
          onPlayGame={() => setShowGame(true)}
        />
      )}
    </div>
  )
}
