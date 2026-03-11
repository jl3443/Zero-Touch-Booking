"use client"

import { useState, useEffect, useRef } from "react"
import { SHIPMENTS, type Shipment } from "@/lib/mock-data"
import { KPICards } from "./kpi-cards"
import { AgentActivityLog } from "./agent-activity-log"
import { ShipmentTable } from "./shipment-table"
import { ExceptionDistributionPanel, DDRiskPanel } from "./exception-panels"
import { MiniMap } from "./mini-map"
import { ShipmentDrawer } from "./shipment-drawer"
import { type SidebarView } from "./sidebar"
import { Brain, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { type SentEmailItem } from "./email-sent-page"

// ── Corridor groupings for AI analysis ──────────────────────────────────────
const CORRIDORS: { name: string; shipmentIds: string[] }[] = [
  { name: "APAC → Americas", shipmentIds: ["SHP-10421", "SHP-20334", "SHP-40672"] },
  { name: "South Asia → Intl", shipmentIds: ["SHP-30188", "SHP-70991"] },
  { name: "Domestic US & New", shipmentIds: ["SHP-60441", "SHP-50219", "SHP-88442"] },
]

const SEVERITY_DOT: Record<string, string> = {
  Critical: "bg-red-500",
  High: "bg-amber-500",
  Medium: "bg-yellow-400",
  Low: "bg-green-500",
}

interface DashboardProps {
  searchQuery: string
  onViewChange?: (view: SidebarView) => void
  onOpenWeather?: (shipmentId: string) => void
  onSendNotification?: (email: SentEmailItem) => void
  autoOpenShipmentId?: string
  onEtaApproved?: () => void
  etaUpdatedCount?: number
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-end gap-[3px] ml-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: "900ms" }}
        />
      ))}
    </span>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard({ searchQuery, onViewChange, onOpenWeather, onSendNotification, autoOpenShipmentId, onEtaApproved, etaUpdatedCount }: DashboardProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [analysisThinking, setAnalysisThinking] = useState(true)
  const prevAutoOpen = useRef<string | undefined>(undefined)

  useEffect(() => {
    const t = setTimeout(() => setAnalysisThinking(false), 1800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (autoOpenShipmentId && autoOpenShipmentId !== prevAutoOpen.current) {
      prevAutoOpen.current = autoOpenShipmentId
      const s = SHIPMENTS.find((sh) => sh.id === autoOpenShipmentId)
      if (s) setSelectedShipment(s)
    }
  }, [autoOpenShipmentId])

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-5 space-y-4 max-w-[1600px] mx-auto">
        {/* AI Agent Analysis — thinking animation → structured cards */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border-b border-indigo-100">
            <Brain size={14} className={`text-indigo-600 shrink-0 ${analysisThinking ? "animate-pulse" : ""}`} />
            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">AI Portfolio Analysis</span>
            {!analysisThinking && <span className="text-[10px] text-indigo-400 ml-auto">7 shipments across 3 corridors</span>}
          </div>

          {analysisThinking ? (
            <div className="flex items-center gap-1.5 px-4 py-4">
              <span className="text-xs text-indigo-600 font-medium">Analyzing portfolio</span>
              <ThinkingDots />
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {/* Corridor cards */}
              <div className="grid grid-cols-3 gap-3">
                {CORRIDORS.map((corridor) => {
                  const ships = corridor.shipmentIds.map(id => SHIPMENTS.find(s => s.id === id)).filter(Boolean) as typeof SHIPMENTS
                  const avgDelay = ships.length > 0 ? Math.round(ships.reduce((s, sh) => s + sh.delayHours, 0) / ships.length) : 0
                  return (
                    <div key={corridor.name} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-semibold text-gray-700">{corridor.name}</p>
                        <span className="text-[10px] text-gray-400">{ships.length} shipments</span>
                      </div>
                      <div className="space-y-1.5">
                        {ships.map((sh) => (
                          <button
                            key={sh.id}
                            onClick={() => setSelectedShipment(sh)}
                            className="flex items-center gap-2 w-full text-left group"
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", SEVERITY_DOT[sh.severity] || "bg-gray-400")} />
                            <span className="text-[11px] font-mono font-semibold text-blue-600 group-hover:underline">{sh.id}</span>
                            <span className="text-[10px] text-gray-400 truncate">{sh.carrier}</span>
                            {sh.delayHours > 0 && (
                              <span className="text-[10px] font-medium text-red-500 ml-auto shrink-0">+{sh.delayHours}h</span>
                            )}
                          </button>
                        ))}
                      </div>
                      {avgDelay > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <span className="text-[10px] text-gray-400">Avg delay: </span>
                          <span className="text-[10px] font-semibold text-amber-600">+{avgDelay}h</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Key insights */}
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
                <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-1.5">Key Insights</p>
                <ul className="space-y-1">
                  {[
                    "APAC→Americas corridor averaging +19h delay — PVG ground stop, LA port congestion (+18–24h berth wait)",
                    "SHP-20334 highest risk — 44h customs hold at ORD, approaching hub slot deadline",
                    "Agent pre-drafted 2 destination notifications — Detroit Assembly (Line 3) and LAX Dock B",
                    "OTM sync pending for SHP-10421 and SHP-40672 — recommend coordinator review",
                  ].map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-gray-600 leading-relaxed">
                      <ArrowRight size={10} className="text-indigo-400 mt-0.5 shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Condensed Agent Activity Feed */}
        <AgentActivityLog
          condensed
          maxItems={1}
          onShipmentClick={(id) => {
            const s = SHIPMENTS.find((sh) => sh.id === id)
            if (s) setSelectedShipment(s)
          }}
          onViewAll={() => onViewChange?.("agent-activity")}
        />

        {/* KPI Cards */}
        <KPICards
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onExceptionsClick={() => onViewChange?.("exceptions")}
          etaUpdatedCount={etaUpdatedCount}
        />

        {/* Exception distribution + Likely Delay Order + Geographic Overview — above table */}
        <div className="grid grid-cols-3 gap-4">
          <ExceptionDistributionPanel onExceptionClick={() => onViewChange?.("exceptions")} />
          <DDRiskPanel onShipmentClick={(id) => {
            const s = SHIPMENTS.find((sh) => sh.id === id)
            if (s) setSelectedShipment(s)
          }} />
          <MiniMap onShipmentClick={setSelectedShipment} />
        </div>

        {/* Shipment Table — below panels */}
        <ShipmentTable
          searchQuery={searchQuery}
          activeFilter={activeFilter}
          onSelectShipment={setSelectedShipment}
          selectedId={selectedShipment?.id ?? null}
        />
      </div>

      {/* Detail Drawer */}
      {selectedShipment && (
        <ShipmentDrawer
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
          onOpenWeather={onOpenWeather}
          onSendNotification={onSendNotification}
          onEtaApproved={onEtaApproved}
        />
      )}
    </div>
  )
}
