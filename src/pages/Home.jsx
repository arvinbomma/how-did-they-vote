import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const [address, setAddress] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    if (address.trim()) {
      navigate(`/officials?address=${encodeURIComponent(address.trim())}`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
          How Did They Vote?
        </h1>
        <p className="text-slate-400 text-lg mb-10 leading-relaxed">
          Enter your address to see every elected official representing you —
          and what they've actually voted on.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-16">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, Phoenix, AZ 85001"
            className="flex-1 px-6 py-3 rounded-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-slate-500 text-base"
          />
          <button
            type="submit"
            className="px-7 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-colors cursor-pointer"
          >
            Look Up
          </button>
        </form>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {[
            { label: 'Federal · State · Local', desc: 'All levels of government' },
            { label: 'Real votes, plain English', desc: 'No political jargon' },
            { label: 'Powered by public records', desc: 'Official legislative data' },
          ].map(({ label, desc }) => (
            <div
              key={label}
              className="flex-1 bg-slate-800 rounded-2xl px-5 py-5 text-center"
            >
              <p className="text-white font-semibold text-sm mb-1">{label}</p>
              <p className="text-slate-400 text-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
