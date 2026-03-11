"use client"

import { useEffect, useRef } from "react"
import { SHIPMENTS, PORT_STATUS, type CongestionLevel } from "@/lib/mock-data"
import { ModeBadge, SeverityBadge } from "./shared"
import { cn } from "@/lib/utils"
import { CloudLightning, AlertTriangle, MapPin, Clock, TrendingUp, TrendingDown, Minus, Anchor } from "lucide-react"

const CONGESTION_CONFIG: Record<CongestionLevel, { color: string; dot: string; bar: string }> = {
  Low:      { color: "text-green-700 bg-green-50 border-green-200",   dot: "bg-green-500",  bar: "bg-green-500" },
  Medium:   { color: "text-amber-700 bg-amber-50 border-amber-200",   dot: "bg-amber-500",  bar: "bg-amber-400" },
  High:     { color: "text-orange-700 bg-orange-50 border-orange-200", dot: "bg-orange-500", bar: "bg-orange-500" },
  Critical: { color: "text-red-700 bg-red-50 border-red-200",         dot: "bg-red-500 animate-pulse", bar: "bg-red-500" },
}

const CONGESTION_LEVEL: Record<CongestionLevel, number> = { Low: 25, Medium: 55, High: 80, Critical: 98 }

// Shipments with disruption context (weather or traffic)
const DISRUPTION_TYPES: Record<string, { type: "weather" | "traffic" | "customs" | "port"; label: string; color: string; icon: React.ReactNode }> = {
  "Weather Disruption": { type: "weather", label: "Weather", color: "text-blue-700 bg-blue-50 border-blue-200", icon: <CloudLightning size={12} /> },
  "Traffic Disruption": { type: "traffic", label: "Traffic", color: "text-amber-700 bg-amber-50 border-amber-200", icon: <TrendingUp size={12} /> },
}

const activeDisruptions = SHIPMENTS.filter(
  (s) => s.disruptionContext && (s.exceptionType === "Weather Disruption" || s.exceptionType === "Traffic Disruption")
)

const WEATHER_ALERTS = [
  {
    id: "WA-001",
    title: "Severe Storm System — Shanghai PVG Hub",
    severity: "Critical" as const,
    type: "weather",
    area: "Shanghai Pudong International Airport (PVG)",
    detail: "Typhoon remnant causing ground stop. All outbound cargo flights suspended. Expected clearance: Mar 11 18:00 UTC.",
    affectedLanes: ["CAN→DTW", "SHA→LAX"],
    affectedShipments: ["SHP-40672"],
    validUntil: "Mar 11, 18:00 UTC",
  },
  {
    id: "WA-002",
    title: "Arabian Sea — Low Pressure System",
    severity: "High" as const,
    type: "weather",
    area: "Northern Arabian Sea (14°N 68°E)",
    detail: "Tropical low strengthening. Winds 25–35 knots, seas 3–5m. AIS reliability reduced. Mariners advised to reroute north.",
    affectedLanes: ["BOM→RTM"],
    affectedShipments: ["SHP-30178"],
    validUntil: "Mar 12, 12:00 UTC",
  },
  {
    id: "WA-003",
    title: "I-40 East Incident — Flagstaff, AZ",
    severity: "High" as const,
    type: "traffic",
    area: "I-40 East, near Flagstaff, AZ (MM 199)",
    detail: "Multi-vehicle accident blocking 2 of 3 lanes. AZ DPS estimating 4-hour clearance. Alternate via I-17 adds +2h.",
    affectedLanes: ["LAX→PHX"],
    affectedShipments: ["SHP-60441"],
    validUntil: "Mar 11, 14:00 local",
  },
  {
    id: "WA-004",
    title: "LA Port — WBCT Terminal Congestion",
    severity: "Medium" as const,
    type: "port",
    area: "West Basin Container Terminal, Los Angeles Port",
    detail: "22+ vessel queue at anchor. Average berth wait 18–24h. Peak import season expected to ease mid-March.",
    affectedLanes: ["SHA→LAX"],
    affectedShipments: ["SHP-10421"],
    validUntil: "Ongoing",
  },
]

const TYPE_STYLES = {
  weather: { bg: "border-l-blue-500", badge: "bg-blue-50 border-blue-200 text-blue-700", icon: <CloudLightning size={14} className="text-blue-600" /> },
  traffic: { bg: "border-l-amber-500", badge: "bg-amber-50 border-amber-200 text-amber-700", icon: <TrendingUp size={14} className="text-amber-600" /> },
  port: { bg: "border-l-purple-500", badge: "bg-purple-50 border-purple-200 text-purple-700", icon: <MapPin size={14} className="text-purple-600" /> },
}

const SEV_DOT: Record<string, string> = {
  Critical: "bg-red-500",
  High: "bg-amber-500",
  Medium: "bg-yellow-400",
}

interface WeatherTrafficPageProps {
  highlightShipmentId?: string
}

export function WeatherTrafficPage({ highlightShipmentId }: WeatherTrafficPageProps) {
  const highlightRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (highlightShipmentId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [highlightShipmentId])

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-6 max-w-[1100px] mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
              <CloudLightning size={16} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Weather & Traffic</h2>
              <p className="text-xs text-gray-400">Active disruptions affecting current shipment lanes · Updated Mar 12, 10:20</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-red-600 font-semibold bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {WEATHER_ALERTS.filter((a) => a.severity === "Critical").length} Critical
            </span>
            <span className="flex items-center gap-1 text-amber-600 font-semibold bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
              {WEATHER_ALERTS.filter((a) => a.severity === "High").length} High
            </span>
          </div>
        </div>

        {/* Active alerts */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Active Disruption Alerts</h3>
          {WEATHER_ALERTS.map((alert) => {
            const typeStyle = TYPE_STYLES[alert.type as keyof typeof TYPE_STYLES] ?? TYPE_STYLES.weather
            return (
              <div
                key={alert.id}
                className={cn(
                  "bg-white rounded-xl border border-l-4 border-gray-200 p-4",
                  typeStyle.bg
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 mt-0.5",
                      typeStyle.badge
                    )}>
                      {typeStyle.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", SEV_DOT[alert.severity] ?? "bg-gray-400")} />
                        <span className="font-semibold text-sm text-gray-800">{alert.title}</span>
                        <span className={cn("text-[10px] font-semibold rounded-full border px-2 py-0.5", typeStyle.badge)}>
                          {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-2">
                        <MapPin size={10} />
                        <span>{alert.area}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{alert.detail}</p>
                      <div className="mt-2 flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <Clock size={10} />
                          <span>Valid until: {alert.validUntil}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {alert.affectedLanes.map((lane) => (
                            <span key={lane} className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{lane}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="text-[10px] text-gray-400 mb-1 text-right">Affected</div>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {alert.affectedShipments.map((id) => (
                        <span key={id} className="font-mono text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold">
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Shipment disruption details */}
        <div>
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Shipment-Level Disruption Context</h3>
          <div className="grid gap-3">
            {activeDisruptions.map((s) => {
              const exType = s.exceptionType as keyof typeof DISRUPTION_TYPES
              const cfg = DISRUPTION_TYPES[exType]
              const isHighlighted = s.id === highlightShipmentId
              return (
                <div
                  key={s.id}
                  ref={isHighlighted ? highlightRef : null}
                  className={cn(
                    "bg-white rounded-xl border p-4 transition-all duration-500",
                    isHighlighted
                      ? "border-blue-400 ring-2 ring-blue-200 shadow-md"
                      : "border-gray-200"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono font-bold text-blue-700 text-sm">{s.id}</span>
                        {isHighlighted && (
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                            ← Navigated from shipment detail
                          </span>
                        )}
                        <ModeBadge mode={s.mode} />
                        <SeverityBadge severity={s.severity} />
                        {cfg && (
                          <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold rounded-full border px-2 py-0.5", cfg.color)}>
                            {cfg.icon} {cfg.label}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">{s.carrier} · {s.origin} → {s.destination}</div>
                      <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-700 leading-relaxed">
                        {s.disruptionContext}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-[11px]">
                        <span className="text-gray-400">Planned: <span className="font-mono text-gray-600">{s.plannedETA.replace("2025 ", "")}</span></span>
                        <span className="text-gray-400">→ Revised: <span className="font-mono text-red-600 font-semibold">{s.revisedETA.replace("2025 ", "")}</span></span>
                        <span className="font-semibold text-red-600">+{s.delayHours}h</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Port Intelligence — inspired by project44 Port Intel */}
        <div>
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Anchor size={12} /> Port Intelligence · 5 Key Ports
          </h3>
          <div className="grid grid-cols-5 gap-3">
            {PORT_STATUS.map((port) => {
              const cfg = CONGESTION_CONFIG[port.congestionLevel]
              const trendIcon = port.trend === "improving"
                ? <TrendingDown size={11} className="text-green-500" />
                : port.trend === "worsening"
                  ? <TrendingUp size={11} className="text-red-500" />
                  : <Minus size={11} className="text-gray-400" />
              return (
                <div key={port.code} className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-gray-400">{port.code}</span>
                    <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                  </div>
                  <div className="text-xs font-semibold text-gray-800 leading-tight mb-1">{port.name}</div>
                  <div className="text-[10px] text-gray-400 mb-2">{port.country}</div>

                  <div className="w-full h-1.5 rounded-full bg-gray-100 mb-2 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", cfg.bar)} style={{ width: `${CONGESTION_LEVEL[port.congestionLevel]}%` }} />
                  </div>

                  <span className={cn("inline-block text-[10px] font-semibold border rounded-full px-1.5 py-0.5 mb-2", cfg.color)}>
                    {port.congestionLevel}
                  </span>

                  <div className="space-y-1 text-[10px] text-gray-500">
                    <div className="flex justify-between">
                      <span>Queue</span>
                      <span className="font-medium text-gray-700">
                        {port.vesselQueue > 0 ? `${port.vesselQueue} vessels` : port.avgBerthWait}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg wait</span>
                      <span className="font-medium text-gray-700">{port.avgBerthWait}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dwell</span>
                      <span className="font-medium text-gray-700">{port.avgDwell}</span>
                    </div>
                    <div className="flex items-center gap-1 pt-0.5">
                      {trendIcon}
                      <span className={port.trend === "improving" ? "text-green-600" : port.trend === "worsening" ? "text-red-600" : "text-gray-500"}>
                        {port.trend.charAt(0).toUpperCase() + port.trend.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-100 text-[9px] text-gray-400 leading-relaxed">
                    {port.note}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Lane-level risk summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-600" />
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lane Risk Summary</h3>
          </div>
          <div className="space-y-2">
            {[
              { lane: "SHA→LAX", risk: "High", reason: "Port congestion + peak season", shipments: 1 },
              { lane: "BOM→RTM", risk: "High", reason: "Arabian Sea weather + AIS loss", shipments: 1 },
              { lane: "CAN→DTW", risk: "Critical", reason: "PVG ground stop — active", shipments: 1 },
              { lane: "LAX→PHX", risk: "High", reason: "I-40 incident — resolving", shipments: 1 },
              { lane: "BOM→LAX", risk: "Medium", reason: "DXB hub capacity constraints", shipments: 1 },
            ].map((row) => (
              <div key={row.lane} className="flex items-center gap-3 text-xs">
                <span className="font-mono text-gray-600 w-20 shrink-0">{row.lane}</span>
                <span className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold w-16 text-center",
                  row.risk === "Critical" ? "bg-red-50 border-red-200 text-red-700" :
                  row.risk === "High" ? "bg-amber-50 border-amber-200 text-amber-700" :
                  "bg-yellow-50 border-yellow-200 text-yellow-700"
                )}>{row.risk}</span>
                <span className="text-gray-500 flex-1">{row.reason}</span>
                <span className="text-gray-400 shrink-0">{row.shipments} shipment{row.shipments !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
