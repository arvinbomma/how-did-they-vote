import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

const LEVELS = ['All', 'Federal', 'State', 'Local']

const PARTY_STYLES = {
  Democrat: 'bg-blue-600 text-white',
  Republican: 'bg-red-600 text-white',
  Independent: 'bg-gray-600 text-white',
}

export default function Officials() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const address = searchParams.get('address') || ''
  const [activeLevel, setActiveLevel] = useState('All')
  const [officials, setOfficials] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!address) return
    setLoading(true)
    setError(null)
    fetch(`http://localhost:8000/officials?address=${encodeURIComponent(address)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setOfficials(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [address])

  const filtered =
    activeLevel === 'All'
      ? officials
      : officials.filter((o) => o.level === activeLevel)

  function handleCardClick(official) {
    const params = new URLSearchParams({
      name: official.name,
      state: official.state ?? '',
      level: official.level,
      openstates_id: official.openstates_id ?? '',
      party: official.party ?? '',
      title: official.title ?? '',
    })
    navigate(`/official/${official.id}?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        {address && (
          <p className="text-slate-400 text-sm mb-6">
            Showing results for:{' '}
            <span className="text-white font-medium">{address}</span>
          </p>
        )}

        <div className="flex gap-2 mb-8 flex-wrap">
          {LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => setActiveLevel(level)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                activeLevel === level
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {loading && (
          <p className="text-slate-400 text-base text-center py-16">
            Finding your representatives...
          </p>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-2xl px-6 py-5 text-center">
            <p className="text-red-300 font-semibold mb-1">Failed to load officials</p>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((official) => (
              <button
                key={official.id}
                onClick={() => handleCardClick(official)}
                className="bg-slate-800 rounded-2xl p-5 text-left hover:bg-slate-700 transition-colors cursor-pointer w-full"
              >
                <p className="text-white font-bold text-lg leading-tight mb-1">
                  {official.name}
                </p>
                <p className="text-slate-400 text-sm mb-3">{official.title}</p>
                <div className="flex gap-2 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${PARTY_STYLES[official.party] ?? 'bg-gray-600 text-white'}`}
                  >
                    {official.party}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
                    {official.level}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
