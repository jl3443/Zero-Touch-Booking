"use client"

import { useState, useEffect } from "react"
import { Search, RefreshCw, Brain, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface TopBarProps {
  onSearch: (q: string) => void
  onToggleAIChat?: () => void
  aiChatOpen?: boolean
  canGoBack?: boolean
  onBack?: () => void
}

export function TopBar({ onSearch, onToggleAIChat, aiChatOpen, canGoBack, onBack }: TopBarProps) {
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
        {/* Left: back button + search */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          {canGoBack && (
            <button
              onClick={onBack}
              className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-md bg-slate-700 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 transition-colors text-xs font-medium"
              title="Go back"
            >
              <ChevronLeft size={14} />
              <span>Back</span>
            </button>
          )}
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search bookings by ID, carrier, lane, status…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                onSearch(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQuery("")
                  onSearch("")
                }
              }}
              className="w-full bg-slate-700 border border-slate-600 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Right: AI chat toggle + live indicator + refresh */}
        <div className="flex items-center gap-3 text-xs text-slate-400 ml-4">
          {/* AI Chat toggle */}
          <button
            onClick={onToggleAIChat}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors text-xs font-medium",
              aiChatOpen
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-slate-700 border-slate-600 text-slate-300 hover:text-white hover:border-indigo-500"
            )}
            title="Open AI Assistant"
          >
            <Brain size={12} className={aiChatOpen ? "" : "text-indigo-400"} />
            <span>AI</span>
          </button>

          {/* Divider */}
          <span className="w-px h-4 bg-slate-600" />

          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
            Live
          </span>
          <span>
            Last refresh: <span className="text-slate-300 font-mono">{timeStr}</span>
          </span>
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
