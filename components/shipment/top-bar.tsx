"use client"

import { useState, useEffect } from "react"
import { Search, RefreshCw } from "lucide-react"

interface TopBarProps {
  onSearch: (q: string) => void
}

export function TopBar({ onSearch }: TopBarProps) {
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => {
    setLastRefresh(new Date())
    const interval = setInterval(() => {
      setLastRefresh(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setSpinning(true)
    setTimeout(() => {
      setLastRefresh(new Date())
      setSpinning(false)
    }, 800)
  }

  const timeStr = lastRefresh
    ? lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "--:--"

  return (
    <header className="bg-[#1E293B] text-white border-b border-slate-700">
      <div className="flex items-center justify-between px-5 py-3">
        {/* Left: search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search shipment ID, carrier, destination..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                onSearch(e.target.value)
              }}
              className="w-full bg-slate-700 border border-slate-600 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Right: live indicator + refresh */}
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
            Live
          </span>
          <span>Last refresh: <span className="text-slate-300 font-mono">{timeStr}</span></span>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-700"
            aria-label="Refresh data"
          >
            <RefreshCw size={12} className={spinning ? "animate-spin" : ""} />
            <span className="text-xs">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  )
}
