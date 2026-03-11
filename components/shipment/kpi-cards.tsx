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

      {/* Primary row — prominent */}
      <div className="grid grid-cols-3 gap-3">
        <PrimaryKPICard
          label="At-Risk Shipments"
          value={6}
          trend="up"
          trendLabel="+2 from yesterday"
          accent="amber"
          icon={<AlertTriangle size={18} />}
          active={activeFilter === "at-risk"}
          onClick={() => handleClick("at-risk")}
        />
        <PrimaryKPICard
          label="Critical Delays"
          value={1}
          trend="stable"
          trendLabel="Same as yesterday"
          accent="red"
          icon={<TrendingUp size={18} />}
          active={activeFilter === "critical"}
          onClick={() => handleClick("critical")}
        />
        <PrimaryKPICard
          label="Missing Signal"
          value={1}
          trend="up"
          trendLabel="+1 from yesterday"
          accent="gray"
          icon={<Radio size={18} />}
          active={activeFilter === "missing-signal"}
          onClick={() => handleClick("missing-signal")}
        />
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-3 gap-3">
        <SecondaryKPICard
          label="Total Active Shipments"
          value={7}
          icon={<Package size={14} />}
        />
        <SecondaryKPICard
          label="ETA Updated (24h)"
          value={etaUpdatedCount}
          icon={<Clock size={14} />}
        />
        <SecondaryKPICard
          label="On-Time %"
          value="14%"
          icon={<CheckCircle2 size={14} />}
          valueColor="text-red-600"
        />
      </div>
    </div>
  )
}

interface PrimaryKPICardProps {
  label: string
  value: number
  trend: "up" | "down" | "stable"
  trendLabel: string
  accent: "red" | "amber" | "gray"
  icon: React.ReactNode
  active: boolean
  onClick: () => void
}

function PrimaryKPICard({ label, value, trend, trendLabel, accent, icon, active, onClick }: PrimaryKPICardProps) {
  const accentMap = {
    red: { ring: "border-red-300 bg-red-50", icon: "text-red-500", value: "text-red-700", trend: "text-red-600", border: "border-l-red-500" },
    amber: { ring: "border-amber-300 bg-amber-50", icon: "text-amber-500", value: "text-amber-700", trend: "text-amber-600", border: "border-l-amber-500" },
    gray: { ring: "border-gray-300 bg-gray-50", icon: "text-gray-500", value: "text-gray-700", trend: "text-gray-600", border: "border-l-gray-400" },
  }
  const colors = accentMap[accent]

  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left rounded-lg border border-l-4 p-5 transition-all cursor-pointer hover:shadow-md",
        active ? `${colors.ring} shadow-sm ring-2 ring-offset-1 ring-current ${colors.border}` : `bg-white border-gray-200 hover:border-gray-300 ${colors.border}`
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
          <p className={cn("text-3xl font-bold", active ? colors.value : "text-slate-800")}>{value}</p>
        </div>
        <div className={cn("p-2 rounded-lg", active ? colors.ring : "bg-gray-100")}>
          <span className={active ? colors.icon : "text-gray-400"}>{icon}</span>
        </div>
      </div>
      <div className={cn("flex items-center gap-1 mt-2 text-[11px] font-medium", active ? colors.trend : "text-gray-500")}>
        {trend === "up" && <span>▲</span>}
        {trend === "down" && <span>▼</span>}
        {trendLabel}
      </div>
    </button>
  )
}

interface SecondaryKPICardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  valueColor?: string
}

function SecondaryKPICard({ label, value, icon, valueColor = "text-slate-700" }: SecondaryKPICardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-2.5 flex items-center justify-between">
      <div>
        <p className="text-[10px] text-gray-400 font-medium">{label}</p>
        <p className={cn("text-lg font-bold mt-0.5", valueColor)}>{value}</p>
      </div>
      <div className="text-gray-200">{icon}</div>
    </div>
  )
}
