"use client"

import { useState, useEffect } from "react"
import { SHIPMENTS, type Shipment } from "@/lib/mock-data"
import { KPICards } from "./kpi-cards"
import { AgentActivityLog } from "./agent-activity-log"
import { ShipmentTable } from "./shipment-table"
import { ExceptionDistributionPanel, DDRiskPanel } from "./exception-panels"
import { MiniMap } from "./mini-map"
import { ShipmentDrawer } from "./shipment-drawer"
import { type SidebarView } from "./sidebar"
import { Brain, X, ChevronRight, AlertTriangle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardProps {
  searchQuery: string
  onViewChange?: (view: SidebarView) => void
  onOpenWeather?: (shipmentId: string) => void
  aiQuery?: string | null
  onClearAIQuery?: () => void
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

// ── AI Response Generator ────────────────────────────────────────────────────

interface AIResponseLine {
  id: string
  delay: number
  severity: string
  exception: string
  note: string
}

interface AIResponseData {
  heading: string
  summary: string
  lines: AIResponseLine[]
  footer?: string
}

function generateAIResponse(query: string): AIResponseData {
  const q = query.toLowerCase()

  const delayed = SHIPMENTS.filter((s) => s.delayHours > 0).sort((a, b) => b.delayHours - a.delayHours)
  const critical = SHIPMENTS.filter((s) => s.severity === "Critical")
  const high = SHIPMENTS.filter((s) => s.severity === "High")
  const weatherTraffic = SHIPMENTS.filter((s) => s.exceptionType === "Weather Disruption" || s.exceptionType === "Traffic Disruption")
  const customsHold = SHIPMENTS.filter((s) => s.exceptionType === "Customs Hold")

  // ETA update / delay queries
  if (q.includes("eta") || q.includes("update") || q.includes("delay") || q.includes("延误") || q.includes("迟")) {
    return {
      heading: "Shipments Requiring ETA Update",
      summary: `${delayed.length} shipments have active delays totaling +${delayed.reduce((sum, s) => sum + s.delayHours, 0)}h across the portfolio. Recommended to review and push revised ETAs to OTM.`,
      lines: delayed.map((s) => ({
        id: s.id,
        delay: s.delayHours,
        severity: s.severity,
        exception: s.exceptionType,
        note: s.revisedETA.replace("2025 ", ""),
      })),
      footer: "Action: Open each shipment → OTM & Notifications tab → Approve OTM Update",
    }
  }

  // Risk / critical queries
  if (q.includes("risk") || q.includes("critical") || q.includes("风险") || q.includes("危") || q.includes("urgent")) {
    const riskShipments = [...critical, ...high.filter((s) => s.criticalMaterial)]
    return {
      heading: "High-Risk Shipments",
      summary: `${critical.length} Critical and ${high.length} High severity shipments detected. ${critical.filter((s) => s.criticalMaterial).length + high.filter((s) => s.criticalMaterial).length} flagged as Critical Material with production line risk.`,
      lines: riskShipments.map((s) => ({
        id: s.id,
        delay: s.delayHours,
        severity: s.severity,
        exception: s.exceptionType,
        note: s.plant,
      })),
      footer: "Recommended: Escalate Critical Material shipments immediately via Exceptions page",
    }
  }

  // Weather / traffic queries
  if (q.includes("weather") || q.includes("traffic") || q.includes("storm") || q.includes("天气") || q.includes("disruption")) {
    return {
      heading: "Weather & Traffic Disruptions",
      summary: `${weatherTraffic.length} shipments impacted by weather or traffic events. PVG ground stop (typhoon remnant) is the highest-impact active disruption.`,
      lines: weatherTraffic.map((s) => ({
        id: s.id,
        delay: s.delayHours,
        severity: s.severity,
        exception: s.exceptionType,
        note: s.disruptionContext?.split(".")[0] ?? s.currentStatus,
      })),
      footer: "See Weather / Traffic page for full disruption context and lane risk summary",
    }
  }

  // Customs queries
  if (q.includes("customs") || q.includes("hold") || q.includes("清关") || q.includes("海关")) {
    return {
      heading: "Customs Hold Shipments",
      summary: `${customsHold.length} shipment(s) under customs hold. These require immediate broker coordination to avoid further slippage.`,
      lines: customsHold.map((s) => ({
        id: s.id,
        delay: s.delayHours,
        severity: s.severity,
        exception: s.exceptionType,
        note: s.recommendedAction,
      })),
      footer: "Action: Coordinate with customs broker and provide missing documentation",
    }
  }

  // Default: full portfolio summary
  return {
    heading: "Portfolio Status Overview",
    summary: `Monitoring ${SHIPMENTS.length} active shipments. ${critical.length} Critical, ${high.length} High severity. Total delay exposure: +${delayed.reduce((sum, s) => sum + s.delayHours, 0)}h across ${delayed.length} shipments.`,
    lines: SHIPMENTS.slice(0, 5).map((s) => ({
      id: s.id,
      delay: s.delayHours,
      severity: s.severity,
      exception: s.exceptionType,
      note: s.currentStatus,
    })),
    footer: `Tip: Ask about "delays", "risk", "weather disruptions", or "customs holds" for targeted insights`,
  }
}

const SEV_COLOR: Record<string, string> = {
  Critical: "text-red-700 bg-red-50 border-red-200",
  High: "text-amber-700 bg-amber-50 border-amber-200",
  Medium: "text-yellow-700 bg-yellow-50 border-yellow-200",
  Low: "text-green-700 bg-green-50 border-green-200",
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard({ searchQuery, onViewChange, onOpenWeather, aiQuery, onClearAIQuery }: DashboardProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [analysisThinking, setAnalysisThinking] = useState(true)
  const [aiThinking, setAiThinking] = useState(false)
  const [aiResponse, setAiResponse] = useState<AIResponseData | null>(null)
  const [displayedQuery, setDisplayedQuery] = useState<string>("")

  useEffect(() => {
    const t = setTimeout(() => setAnalysisThinking(false), 1800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!aiQuery) return
    setDisplayedQuery(aiQuery)
    setAiResponse(null)
    setAiThinking(true)
    const t = setTimeout(() => {
      setAiResponse(generateAIResponse(aiQuery))
      setAiThinking(false)
    }, 1600)
    return () => clearTimeout(t)
  }, [aiQuery])

  const handleCloseAI = () => {
    setAiResponse(null)
    setAiThinking(false)
    setDisplayedQuery("")
    onClearAIQuery?.()
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-5 space-y-4 max-w-[1600px] mx-auto">
        {/* AI Agent Analysis — thinking animation → output */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
          <div className="flex items-start gap-2.5">
            <Brain size={14} className={`text-indigo-600 mt-0.5 shrink-0 ${analysisThinking ? "animate-pulse" : ""}`} />
            {analysisThinking ? (
              <div className="flex items-center gap-1.5 py-0.5">
                <span className="text-xs text-indigo-600 font-medium">Analyzing portfolio</span>
                <ThinkingDots />
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                  Monitoring <strong>7 active shipments</strong> across 3 corridors (APAC→Americas, South Asia→Europe, Domestic US) — <strong>2 Critical</strong> and <strong>4 High</strong> exceptions active. SHP-40672 (FedEx, CAN→DTW) and SHP-70991 (Emirates SkyCargo, BOM→LAX) flagged for immediate carrier escalation due to assembly line deadline risk.
                </p>
                <p className="text-xs text-indigo-600 leading-relaxed">
                  APAC→Americas corridor averaging <strong>+19h delay</strong> this week, driven by PVG ground stop (typhoon remnant), LA Port congestion (+18–24h berth wait), and DXB hub dwell. SHP-20334 Customs Hold at ORD is the highest-risk delay order item with 44h slippage. Agent has pre-drafted destination notifications for Detroit Assembly Plant (Line 3) and LAX Receiving Dock B — recommend coordinator review and send. OTM sync pending for SHP-10421 and SHP-40672.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* AI Query Response Panel */}
        {(aiThinking || aiResponse) && (
          <div className="bg-white border border-indigo-200 rounded-xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border-b border-indigo-100">
              <div className="flex items-center gap-2">
                <Brain size={13} className={cn("text-indigo-500", aiThinking && "animate-pulse")} />
                <span className="text-xs font-semibold text-indigo-700">
                  {aiThinking ? "Agent thinking…" : aiResponse?.heading}
                </span>
                {displayedQuery && (
                  <span className="text-[10px] text-indigo-400 font-normal">
                    — "{displayedQuery}"
                  </span>
                )}
              </div>
              <button onClick={handleCloseAI} className="text-indigo-400 hover:text-indigo-600 transition-colors">
                <X size={13} />
              </button>
            </div>

            {aiThinking ? (
              <div className="px-4 py-4 flex items-center gap-2">
                <ThinkingDots />
                <span className="text-xs text-indigo-500 ml-1">Querying shipment data…</span>
              </div>
            ) : aiResponse && (
              <div className="px-4 py-3 space-y-3">
                {/* Summary */}
                <p className="text-xs text-gray-700 leading-relaxed">{aiResponse.summary}</p>

                {/* Shipment rows */}
                <div className="space-y-1.5">
                  {aiResponse.lines.map((line) => {
                    const shipment = SHIPMENTS.find((s) => s.id === line.id)
                    return (
                      <button
                        key={line.id}
                        onClick={() => {
                          if (shipment) setSelectedShipment(shipment)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 hover:bg-blue-50 hover:border-blue-200 border border-gray-100 transition-colors text-left group"
                      >
                        <span className="font-mono font-bold text-blue-700 text-xs w-20 shrink-0">{line.id}</span>
                        <span className={cn("text-[10px] font-semibold border rounded-full px-1.5 py-0.5 shrink-0", SEV_COLOR[line.severity] ?? "text-gray-600 bg-gray-50 border-gray-200")}>
                          {line.severity}
                        </span>
                        <span className="text-[10px] text-gray-500 shrink-0">{line.exception}</span>
                        {line.delay > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 shrink-0">
                            <Clock size={9} /> +{line.delay}h
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 flex-1 truncate">{line.note}</span>
                        <ChevronRight size={11} className="text-gray-300 group-hover:text-blue-400 shrink-0 transition-colors" />
                      </button>
                    )
                  })}
                </div>

                {/* Footer hint */}
                {aiResponse.footer && (
                  <p className="text-[10px] text-indigo-500 border-t border-indigo-100 pt-2 flex items-center gap-1">
                    <AlertTriangle size={9} /> {aiResponse.footer}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

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
        />
      )}
    </div>
  )
}
