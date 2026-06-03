import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'

const PARTY_STYLES = {
  Democrat: 'bg-blue-600 text-white',
  Republican: 'bg-red-600 text-white',
  Independent: 'bg-gray-600 text-white',
}

const VOTE_STYLES = {
  YES: 'bg-green-700 text-green-100',
  NO: 'bg-red-700 text-red-100',
  ABSTAIN: 'bg-gray-600 text-gray-100',
}

export default function OfficialDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const name = searchParams.get('name') || ''
  const state = searchParams.get('state') || ''
  const level = searchParams.get('level') || ''
  const openstates_id = searchParams.get('openstates_id') || ''
  const party = searchParams.get('party') || ''
  const title = searchParams.get('title') || ''

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams({ name, state, level })
    fetch(`http://localhost:8000/official/${id}/votes?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setResult(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [id, name, state, level])

  const partyStyle = PARTY_STYLES[party] ?? 'bg-gray-600 text-white'

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/officials')}
          className="text-slate-400 hover:text-white text-sm mb-8 flex items-center gap-1 transition-colors cursor-pointer"
        >
          ← Back to Officials
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-1">{name}</h1>
          <p className="text-slate-400 text-base mb-3">{title}</p>
          {party && (
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${partyStyle}`}>
              {party}
            </span>
          )}
        </div>

        {loading && (
          <p className="text-slate-400 text-base text-center py-16">
            Loading votes...
          </p>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-2xl px-6 py-5 text-center">
            <p className="text-red-300 font-semibold mb-1">Failed to load votes</p>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && result && (level === 'Federal' || level === 'Local') && (
          <div className="bg-slate-800 rounded-2xl px-6 py-5">
            <p className="text-slate-300 text-sm leading-relaxed">{result.message}</p>
          </div>
        )}

        {!loading && !error && result && level === 'State' && Array.isArray(result.votes) && (
          <>
            <h2 className="text-xl font-bold text-white mb-4">Recent Votes</h2>
            <div className="flex flex-col gap-4">
              {result.votes.map((vote) => (
                <div key={vote.id} className="bg-slate-800 rounded-2xl p-5">
                  <p className="text-white font-bold text-base mb-1">{vote.billName}</p>
                  <p className="text-slate-500 text-xs mb-3">
                    {vote.billId} · {vote.date}
                  </p>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${VOTE_STYLES[vote.voteCast] ?? 'bg-gray-600 text-gray-100'}`}
                  >
                    {vote.voteCast}
                  </span>

                  <div className="mt-4">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                      AI Summary
                    </p>
                    <p className="text-slate-300 text-sm leading-relaxed">{vote.summary}</p>
                    <p className="text-slate-600 text-xs italic mt-2">
                      AI-generated · See official bill text
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
