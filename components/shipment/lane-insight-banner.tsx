"use client"

import { useState } from "react"
import { Brain, X, ChevronRight } from "lucide-react"
import { LANE_INSIGHTS } from "@/lib/mock-data"

export function LaneInsightBanner() {
  const [insightIndex, setInsightIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const insight = LANE_INSIGHTS[insightIndex]

  return (
    <div className="flex items-center gap-3 bg-blue-950/5 border border-blue-200 rounded-lg px-4 py-2.5">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600/10 shrink-0">
        <Brain size={14} className="text-blue-700" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider mr-2">Agent Insight</span>
        <span className="text-xs text-slate-700">{insight.insight}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium transition-colors"
          onClick={() => setInsightIndex((insightIndex + 1) % LANE_INSIGHTS.length)}
        >
          Next insight
          <ChevronRight size={12} />
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss insight"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
