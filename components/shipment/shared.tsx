"use client"

import { cn } from "@/lib/utils"
import type { ExceptionType, ReasonChip, Severity, TransportMode } from "@/lib/mock-data"
import { Plane, Ship, Truck } from "lucide-react"

// ─── Severity Badge ───────────────────────────────────────────────────────────
export function SeverityBadge({ severity }: { severity: Severity }) {
  const map: Record<Severity, string> = {
    Critical: "bg-red-600 text-white",
    High: "bg-amber-500 text-white",
    Medium: "bg-yellow-400 text-yellow-900",
    Low: "bg-green-100 text-green-800",
  }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide", map[severity])}>
      {severity}
    </span>
  )
}

// ─── Mode Icon ────────────────────────────────────────────────────────────────
export function ModeIcon({ mode, size = 14 }: { mode: TransportMode; size?: number }) {
  const map: Record<TransportMode, { Icon: typeof Plane; color: string }> = {
    Air: { Icon: Plane, color: "text-indigo-600" },
    Ocean: { Icon: Ship, color: "text-blue-600" },
    Road: { Icon: Truck, color: "text-orange-600" },
  }
  const { Icon, color } = map[mode]
  return <Icon size={size} className={color} />
}

// ─── Mode Badge ───────────────────────────────────────────────────────────────
export function ModeBadge({ mode }: { mode: TransportMode }) {
  const map: Record<TransportMode, string> = {
    Air: "bg-indigo-50 text-indigo-700 border-indigo-200",
    Ocean: "bg-blue-50 text-blue-700 border-blue-200",
    Road: "bg-orange-50 text-orange-700 border-orange-200",
  }
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium", map[mode])}>
      <ModeIcon mode={mode} size={11} />
      {mode}
    </span>
  )
}

// ─── Exception Badge ──────────────────────────────────────────────────────────
export function ExceptionBadge({ type }: { type: ExceptionType }) {
  const map: Record<ExceptionType, string> = {
    Delay: "bg-red-50 text-red-700 border-red-200",
    "Missing Signal": "bg-gray-100 text-gray-600 border-gray-300",
    "Long Dwell": "bg-purple-50 text-purple-700 border-purple-200",
    "Route Deviation": "bg-red-50 text-red-700 border-red-300",
    "Weather Disruption": "bg-blue-50 text-blue-700 border-blue-200",
    "Traffic Disruption": "bg-amber-50 text-amber-700 border-amber-200",
    "Customs Hold": "bg-amber-50 text-amber-800 border-amber-300",
    "Conflicting Sources": "bg-gray-50 text-gray-700 border-gray-300",
  }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium whitespace-nowrap", map[type])}>
      {type}
    </span>
  )
}

// ─── Reason Chips ─────────────────────────────────────────────────────────────
export function ReasonChips({ chips }: { chips: ReasonChip[] }) {
  const colorMap: Record<ReasonChip["type"], string> = {
    weather: "bg-blue-100 text-blue-800",
    traffic: "bg-orange-100 text-orange-800",
    signal: "bg-gray-100 text-gray-700",
    port: "bg-teal-100 text-teal-800",
    flight: "bg-purple-100 text-purple-800",
    customs: "bg-amber-100 text-amber-800",
    deviation: "bg-red-100 text-red-800",
    confidence: "bg-gray-100 text-gray-600",
  }
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip) => (
        <span key={chip.label} className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", colorMap[chip.type])}>
          {chip.label}
        </span>
      ))}
    </div>
  )
}

// ─── Delay Display ───────────────────────────────────────────────────────────
export function DelayDisplay({ hours }: { hours: number }) {
  if (hours === 0) return <span className="text-gray-400 text-xs">No delay</span>
  const color = hours >= 12 ? "text-red-600" : hours >= 6 ? "text-amber-600" : "text-yellow-700"
  return <span className={cn("font-mono text-sm font-semibold", color)}>+{hours}h</span>
}

// ─── Confidence Bar ───────────────────────────────────────────────────────────
export function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-600 min-w-[2.5rem]">{score}%</span>
    </div>
  )
}

// ─── OTM Status Badge ─────────────────────────────────────────────────────────
export function OTMStatusBadge({ status }: { status: "Synced" | "Pending Update" | "Needs Review" }) {
  const map = {
    Synced: "bg-green-50 text-green-700 border-green-200",
    "Pending Update": "bg-amber-50 text-amber-700 border-amber-200",
    "Needs Review": "bg-red-50 text-red-700 border-red-200",
  }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium", map[status])}>
      {status}
    </span>
  )
}

// ─── Source Badge ─────────────────────────────────────────────────────────────
export function SourceBadge({ source }: { source: string }) {
  const map: Record<string, string> = {
    GNosis: "bg-blue-600 text-white",
    GPS: "bg-green-600 text-white",
    "Carrier Portal": "bg-indigo-600 text-white",
    Email: "bg-gray-500 text-white",
    UiPath: "bg-purple-600 text-white",
    "Weather API": "bg-sky-500 text-white",
    "Traffic API": "bg-orange-500 text-white",
    "System Alert": "bg-red-500 text-white",
    Agent: "bg-slate-700 text-white",
  }
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide", map[source] ?? "bg-gray-200 text-gray-700")}>
      {source}
    </span>
  )
}
