"use client"

import { cn } from "@/lib/utils"
import { AlertTriangle, Radio, TrendingUp, Package, Clock, CheckCircle2 } from "lucide-react"

interface KPICardsProps {
  activeFilter: string | null
  onFilterChange: (filter: string | null) => void
  onExceptionsClick?: () => void
  etaUpdatedCount?: number
}

export function KPICards({ activeFilter, onFilterChange, onExceptionsClick, etaUpdatedCount = 5 }: KPICardsProps) {
  const handleClick = (filter: string) => {
    if (filter === "at-risk" || filter === "critical" || filter === "missing-signal") {
      onExceptionsClick?.()
      return
    }
    onFilterChange(activeFilter === filter ? null : filter)
  }

  return (
    <div className="space-y-2">
      {/* Summary sentence */}
      <p className="text-sm text-gray-600">
        <span className="font-semibold text-gray-800">7</span> active shipments,{" "}
        <span className="font-semibold text-amber-700">6</span> at risk,{" "}
        <span className="font-semibold text-red-700">1</span> critical
      </p>

      {/* Single compact row */}
      <div className="grid grid-cols-6 gap-2">
        <CompactKPICard
          label="At-Risk"
          value={6}
          trend="▲ +2"
          accent="amber"
          icon={<AlertTriangle size={14} />}
          active={activeFilter === "at-risk"}
          onClick={() => handleClick("at-risk")}
        />
        <CompactKPICard
          label="Critical"
          value={1}
          accent="red"
          icon={<TrendingUp size={14} />}
          active={activeFilter === "critical"}
          onClick={() => handleClick("critical")}
        />
        <CompactKPICard
          label="Missing Signal"
          value={1}
          trend="▲ +1"
          accent="gray"
          icon={<Radio size={14} />}
          active={activeFilter === "missing-signal"}
          onClick={() => handleClick("missing-signal")}
        />
        <CompactKPICard
          label="Total Active"
          value={7}
          icon={<Package size={14} />}
        />
        <CompactKPICard
          label="ETA Updated (24h)"
          value={etaUpdatedCount}
          icon={<Clock size={14} />}
        />
        <CompactKPICard
          label="On-Time %"
          value="14%"
          valueColor="text-red-600"
          icon={<CheckCircle2 size={14} />}
        />
      </div>
    </div>
  )
}

interface CompactKPICardProps {
  label: string
  value: number | string
  trend?: string
  accent?: "red" | "amber" | "gray"
  icon: React.ReactNode
  active?: boolean
  onClick?: () => void
  valueColor?: string
}

const ACCENT_MAP = {
  red: { ring: "border-red-300 bg-red-50", icon: "text-red-500", value: "text-red-700", trend: "text-red-600", border: "border-l-red-500" },
  amber: { ring: "border-amber-300 bg-amber-50", icon: "text-amber-500", value: "text-amber-700", trend: "text-amber-600", border: "border-l-amber-500" },
  gray: { ring: "border-gray-300 bg-gray-50", icon: "text-gray-500", value: "text-gray-700", trend: "text-gray-600", border: "border-l-gray-400" },
}

function CompactKPICard({ label, value, trend, accent, icon, active, onClick, valueColor }: CompactKPICardProps) {
  const colors = accent ? ACCENT_MAP[accent] : null
  const isClickable = !!onClick

  const content = (
    <>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-gray-400 font-medium truncate">{label}</p>
        <span className={cn("shrink-0", active && colors ? colors.icon : "text-gray-300")}>{icon}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <p className={cn("text-xl font-bold", active && colors ? colors.value : valueColor || "text-slate-800")}>{value}</p>
        {trend && (
          <span className={cn("text-[10px] font-medium", active && colors ? colors.trend : "text-gray-400")}>{trend}</span>
        )}
      </div>
    </>
  )

  if (isClickable) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "text-left rounded-lg border px-3 py-2.5 transition-all cursor-pointer hover:shadow-sm",
          accent ? "border-l-[3px]" : "",
          active && colors
            ? `${colors.ring} shadow-sm ring-1 ring-offset-1 ring-current ${colors.border}`
            : colors
              ? `bg-white border-gray-200 hover:border-gray-300 ${colors.border}`
              : "bg-white border-gray-200 hover:border-gray-300"
        )}
      >
        {content}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
      {content}
    </div>
  )
}
