"use client"

import { useState, useEffect } from "react"
import { Search, RefreshCw, Brain, Sparkles } from "lucide-react"

interface TopBarProps {
  onSearch: (q: string) => void
  onAIQuery?: (q: string) => void
}

export function TopBar({ onSearch, onAIQuery }: TopBarProps) {
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim() && onAIQuery) {
      onAIQuery(query.trim())
      setQuery("")
      onSearch("")
    }
  }

  return (
    <header className="bg-[#1E293B] text-white border-b border-slate-700">
      <div className="flex items-center justify-between px-5 py-3">
        {/* Left: search + AI query */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            {/* Icon: Brain when focused, Search otherwise */}
            {isFocused
              ? <Brain size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400 animate-pulse" />
              : <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            }
            <input
              type="text"
              placeholder="Search shipment ID…  or  Ask AI: which orders need ETA update?"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                onSearch(e.target.value)
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md pl-8 pr-20 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {query.trim() && (
              <button
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (onAIQuery) onAIQuery(query.trim())
                  setQuery("")
                  onSearch("")
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold text-indigo-300 hover:text-indigo-100 bg-indigo-900/60 border border-indigo-700 rounded px-1.5 py-0.5 transition-colors"
              >
                <Sparkles size={9} /> Ask AI
              </button>
            )}
          </div>
          {isFocused && (
            <p className="text-[10px] text-slate-500 mt-1 pl-1">
              Type to search · Press <kbd className="bg-slate-700 px-1 rounded text-slate-300">Enter</kbd> or click <span className="text-indigo-400">Ask AI</span> to query the agent
            </p>
          )}
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
