"use client"

import { useState } from "react"
import { SHIPMENTS } from "@/lib/mock-data"
import { ModeBadge, SeverityBadge } from "./shared"
import { cn } from "@/lib/utils"
import {
  GitBranch, ChevronDown, ChevronRight, AlertTriangle, Check,
} from "lucide-react"

// 3-color system: green (ok/info), red (warning/critical), dark-green (agent/resolved)
const STATUS_CONFIG = {
  ok:       { dot: "bg-green-500",  ring: "ring-green-100",  cardBg: "",                 cardBorder: "border-gray-100",  textColor: "text-gray-800" },
  info:     { dot: "bg-green-500",  ring: "ring-green-100",  cardBg: "",                 cardBorder: "border-gray-100",  textColor: "text-gray-700" },
  warning:  { dot: "bg-red-500",    ring: "ring-red-200",    cardBg: "bg-red-50/40",     cardBorder: "border-red-200",   textColor: "text-red-700"  },
  critical: { dot: "bg-red-500",    ring: "ring-red-200",    cardBg: "bg-red-50/40",     cardBorder: "border-red-200",   textColor: "text-red-700"  },
  agent:    { dot: "bg-green-700",  ring: "ring-green-200",  cardBg: "bg-green-50/40",   cardBorder: "border-green-200", textColor: "text-green-800" },
}

export function TimelinePage() {
  const [openShipments, setOpenShipments] = useState<Set<string>>(new Set(["SHP-10421", "SHP-40672"]))

  const toggle = (id: string) => {
    setOpenShipments((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-6 max-w-[1100px] mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center">
            <GitBranch size={16} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Shipment Timeline</h2>
            <p className="text-xs text-gray-400">Chronological event log for all active shipments</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />Ok</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Exception</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-700" />Resolved / ETA Updated</span>
        </div>

        {/* Shipment timelines */}
        <div className="space-y-3">
          {SHIPMENTS.map((shipment) => {
            const isOpen = openShipments.has(shipment.id)
            const hasWarning = shipment.timeline.some((e) => e.status === "warning" || e.status === "critical")

            return (
              <div key={shipment.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => toggle(shipment.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {isOpen
                    ? <ChevronDown size={14} className="text-gray-400 shrink-0" />
                    : <ChevronRight size={14} className="text-gray-400 shrink-0" />
                  }
                  <span className="font-mono font-bold text-blue-700 text-sm w-24 shrink-0">{shipment.id}</span>
                  <ModeBadge mode={shipment.mode} />
                  <SeverityBadge severity={shipment.severity} />
                  <span className="text-xs text-gray-500 truncate flex-1">
                    {shipment.carrier} · {shipment.origin.split(",")[0]} → {shipment.destination.split(",")[0]}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 shrink-0">
                    <span>{shipment.timeline.length} events</span>
                    {hasWarning && (
                      <span className="text-amber-600 font-semibold flex items-center gap-1">
                        <AlertTriangle size={11} /> Anomaly
                      </span>
                    )}
                  </div>
                </button>

                {/* Timeline events */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <div className="relative">
                      {/* Vertical line */}
                      <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gray-200" />

                      <div className="space-y-0">
                        {[...shipment.timeline].reverse().map((event, i, arr) => {
                          const cfg = STATUS_CONFIG[event.status]
                          const isLast = i === arr.length - 1
                          const isResolved = event.status === "agent"
                          const isException = event.status === "warning" || event.status === "critical"
                          return (
                            <div key={i} className="relative flex gap-4 pb-4 last:pb-0">
                              {/* Dot */}
                              <div className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 border-white shrink-0 mt-1 z-10 ring-2",
                                cfg.dot, cfg.ring
                              )}>
                                {isResolved && <Check size={7} className="text-white absolute inset-0 m-auto" />}
                              </div>

                              {/* Content */}
                              <div className={cn(
                                "flex-1 rounded-lg border p-3 -mt-0.5",
                                cfg.cardBg, cfg.cardBorder
                              )}>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className={cn("text-xs font-semibold flex items-center gap-1 mb-0.5", cfg.textColor)}>
                                      {event.event}
                                    </span>
                                    <div className="text-[11px] text-gray-400">{event.location}</div>
                                    {event.anomaly && (
                                      <div className="mt-1 text-[11px] text-red-700 font-medium">{event.anomaly}</div>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="font-mono text-[10px] text-gray-400">{event.timestamp}</div>
                                    <div className="text-[9px] text-gray-300 mt-0.5">{event.source}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* ETA summary */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-[11px]">
                      <span className="text-gray-400">Planned ETA: <span className="font-mono text-gray-600">{shipment.plannedETA.replace("2025 ", "")}</span></span>
                      <span className="text-gray-400">→ Revised: <span className="font-mono text-red-600 font-semibold">{shipment.revisedETA.replace("2025 ", "")}</span></span>
                      <span className="text-red-600 font-semibold">+{shipment.delayHours}h delay</span>
                      <span className="ml-auto text-gray-400">ETA Confidence: <span className="font-semibold text-gray-600">{shipment.etaConfidence}%</span></span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
