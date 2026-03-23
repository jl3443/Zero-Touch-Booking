"use client"

import { useState, useEffect, useRef } from "react"
import {
  SHIPMENTS,
  BOOKING_FUNNEL_EXTENDED,
  EXCEPTION_DISTRIBUTION,
  CARRIER_SCORECARDS,
  PORTAL_STATUSES,
  BOOKING_REQUESTS,
  CRITICAL_EXCEPTIONS,
  FREQUENT_ROUTES,
  SUGGESTED_BOOKINGS,
  DEMO_SHIPMENT,
  DEMO_SCENARIOS,
  DEMO_STEP_DETAILS,
  type Shipment,
  type DemoStepDetail,
} from "@/lib/mock-data"
import { AgentActivityLog } from "./agent-activity-log"
import { ShipmentTable } from "./shipment-table"
import { ShipmentDrawer } from "./shipment-drawer"
import { MiniMap } from "./mini-map"
import { type SidebarView } from "./sidebar"
import {
  Brain, ArrowRight, AlertTriangle, CheckCircle2, Clock, Activity,
  ExternalLink, TrendingUp, Lightbulb, Flame, MapPin, Zap, Ship,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { type SentEmailItem } from "./email-sent-page"
import { CompletionModal } from "./demo-modal"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts"

interface DashboardProps {
  searchQuery: string
  onViewChange?: (view: SidebarView, opts?: { sapOrderId?: string; emailId?: string }) => void
  onOpenWeather?: (shipmentId: string) => void
  onSendNotification?: (email: SentEmailItem) => void
  autoOpenShipmentId?: string
  onEtaApproved?: () => void
  etaUpdatedCount?: number
  // Demo mode props
  demoActive?: boolean
  demoShipmentVisible?: boolean
  demoStep?: number
  demoPaused?: boolean
  demoScenario?: string
  demoExceptionActive?: boolean
  onDemoStepAdvance?: (step: number) => void
  onDemoPause?: () => void
  onDemoResume?: () => void
  onDemoExceptionResolved?: () => void
  onDemoExceptionTriggered?: () => void
  onDemoShipmentDismiss?: () => void
  onDemoComplete?: (elapsedTime: string) => void
  onAddInboxEmail?: (email: { id: string; from: string; fromName: string; subject: string; body: string; timestamp: string; read: boolean; tag: string; tags: string[]; shipmentId: string; shipmentRef: string }) => void
  demoZoomActive?: boolean
  showCompletionModal?: boolean
  onCloseCompletionModal?: () => void
  demoElapsedTime?: string
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

// ── Rate analysis data derived from CARRIER_SCORECARDS ──────────────────────
const rateVariance = CARRIER_SCORECARDS.map((c) => {
  const contractMin = parseInt(c.contractRate.replace(/[^0-9]/g, "").slice(0, 4))
  const spotMin = parseInt(c.spotRate.replace(/[^0-9]/g, "").slice(0, 4))
  return {
    carrier: c.carrier.split(" ")[0],
    contract: contractMin,
    spot: spotMin,
  }
})

// ── Portal health status colors ─────────────────────────────────────────────
const PORTAL_DOT: Record<string, string> = {
  Online: "bg-green-500",
  Degraded: "bg-amber-500 animate-pulse",
  Offline: "bg-red-500",
}

const SEV_BADGE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  High: "bg-amber-100 text-amber-700 border-amber-200",
  Medium: "bg-blue-100 text-blue-700 border-blue-200",
  Low: "bg-gray-100 text-gray-600 border-gray-200",
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard({ searchQuery, onViewChange, onOpenWeather, onSendNotification, autoOpenShipmentId, onEtaApproved, etaUpdatedCount, demoActive, demoShipmentVisible, demoStep, demoPaused, demoScenario, demoExceptionActive, onDemoStepAdvance, onDemoPause, onDemoResume, onDemoExceptionResolved, onDemoExceptionTriggered, onDemoShipmentDismiss, onDemoComplete, onAddInboxEmail, demoZoomActive, showCompletionModal, onCloseCompletionModal, demoElapsedTime }: DashboardProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [bookingMode, setBookingMode] = useState(false)
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

  // Auto-restore booking drawer when returning to dashboard during active demo
  useEffect(() => {
    if (demoActive && (demoStep ?? 0) > 0 && !bookingMode) {
      setSelectedShipment(DEMO_SHIPMENT)
      setBookingMode(true)
    }
  }, [demoActive, demoStep])

  // Adjust data when demo completes
  const demoCompleted = showCompletionModal || false
  const exceptionsCount = BOOKING_REQUESTS.filter((b) => b.bookingStatus === "Exception" || b.bookingStatus === "Awaiting Approval").length
  const completedZeroTouch = BOOKING_REQUESTS.filter((b) => b.bookingStatus === "Confirmed" || b.bookingStatus === "Notified" || b.bookingStatus === "Docs Uploaded").length + (etaUpdatedCount ?? 0) + (demoCompleted ? 1 : 0)
  const zeroTouchRate = BOOKING_REQUESTS.length > 0
    ? Math.round((completedZeroTouch / (BOOKING_REQUESTS.length + (demoCompleted ? 1 : 0))) * 100)
    : 0

  // Dynamic chart data — reflects completed demo booking
  const funnelData = demoCompleted
    ? BOOKING_FUNNEL_EXTENDED.map((s) => s.stage === "Confirmed" ? { ...s, count: s.count + 1 } : s.stage === "SAP Ingested" || s.stage === "Validated" || s.stage === "Carrier Selected" || s.stage === "Submitted" ? { ...s, count: s.count + 1 } : s)
    : BOOKING_FUNNEL_EXTENDED
  const exceptionData = demoCompleted && demoScenario && demoScenario !== "happy-path"
    ? EXCEPTION_DISTRIBUTION.map((e) => {
        const scenarioMap: Record<string, string> = { "missing-data": "Missing Booking Fields", "no-capacity": "Missing Allocation", "portal-failure": "Portal Unavailable", "rate-mismatch": "Rate Mismatch", "carrier-rejection": "Carrier Rejection" }
        return e.type === scenarioMap[demoScenario ?? ""] ? { ...e, count: e.count + 1 } : e
      })
    : EXCEPTION_DISTRIBUTION

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div
        className="p-5 space-y-4 max-w-[1600px] mx-auto transition-transform duration-1000 ease-in-out"
        style={demoZoomActive ? { transform: "scale(1.6)", transformOrigin: "center 70%" } : { transform: "scale(1)" }}
      >

        {/* ── Demo: New Shipment Notification Banner ────────────────────── */}
        {demoActive && demoShipmentVisible && !bookingMode && (
          <div className="animate-in slide-in-from-top-2 duration-500 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-lg overflow-hidden shadow-sm">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Zap size={20} className="text-white" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500 border-2 border-white" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-bold text-gray-900">New Shipment Detected</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">SAP TM</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">OTM</span>
                  <span className="text-[10px] text-gray-400 ml-auto">Just now</span>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-gray-600">
                  <span className="flex items-center gap-1"><Ship size={12} className="text-blue-500" /> Ocean</span>
                  <span className="font-medium text-gray-800">SHA → LAX</span>
                  <span>2×40' HC</span>
                  <span className="text-gray-400">|</span>
                  <span>Suzhou Plant</span>
                  <span className="text-gray-400">|</span>
                  <span>SAP-TM-87234</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedShipment(DEMO_SHIPMENT)
                  setBookingMode(true)
                  onDemoShipmentDismiss?.()
                }}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold rounded-lg transition-colors shadow-sm"
              >
                View & Book
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── 1. AI Analysis — 3 Insight Cards (TOP) ───────────────────── */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border-b border-indigo-100">
            <Brain size={14} className={`text-indigo-600 shrink-0 ${analysisThinking ? "animate-pulse" : ""}`} />
            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">AI Booking Analysis</span>
            {!analysisThinking && <span className="text-[10px] text-indigo-400 ml-auto">{BOOKING_REQUESTS.length} active bookings analyzed</span>}
          </div>

          {analysisThinking ? (
            <div className="flex items-center gap-1.5 px-4 py-4">
              <span className="text-xs text-indigo-600 font-medium">Analyzing booking pipeline</span>
              <ThinkingDots />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0 divide-x divide-gray-100">

              {/* Card 1: Critical Exceptions Needing Attention */}
              <div className="p-4 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-red-500" />
                  <h4 className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Needs Attention</h4>
                  <span className="ml-auto text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5">{CRITICAL_EXCEPTIONS.length}</span>
                </div>
                <div className="space-y-2.5">
                  {CRITICAL_EXCEPTIONS.slice(0, 3).map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => {
                        const s = SHIPMENTS.find((sh) => sh.id === ex.id)
                        if (s) setSelectedShipment(s)
                      }}
                      className="w-full text-left group"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono font-bold text-blue-600 group-hover:underline">{ex.id}</span>
                        <span className={cn("text-[9px] font-semibold border rounded-full px-1.5 py-0.5", SEV_BADGE[ex.severity])}>{ex.severity}</span>
                        <span className="text-[10px] text-gray-400 ml-auto">{ex.lane}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-snug line-clamp-2">{ex.summary}</p>
                    </button>
                  ))}
                </div>
                {CRITICAL_EXCEPTIONS.length > 3 && (
                  <div className="text-[9px] text-gray-400 mt-1">+{CRITICAL_EXCEPTIONS.length - 3} more exception{CRITICAL_EXCEPTIONS.length - 3 > 1 ? "s" : ""}</div>
                )}
                <button
                  onClick={() => onViewChange?.("exceptions")}
                  className="mt-3 flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                >
                  Open Exception Workbench <ExternalLink size={10} />
                </button>
              </div>

              {/* Card 2: Most Frequently Booked Routes */}
              <div className="p-4 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <Flame size={14} className="text-amber-500" />
                  <h4 className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Top Routes (30d)</h4>
                </div>
                <div className="space-y-2.5">
                  {FREQUENT_ROUTES.slice(0, 3).map((r, i) => (
                    <div key={r.lane} className="flex items-start gap-2.5">
                      <span className="text-[11px] font-bold text-gray-300 mt-0.5">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-mono font-semibold text-gray-800">{r.lane}</span>
                          <span className="text-[9px] font-medium text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{r.mode}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
                          <span className="font-medium">{r.bookings} bkgs</span>
                          <span className="text-green-600 font-medium">{r.zeroTouch}%</span>
                          <span className="truncate">{r.carrier}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {FREQUENT_ROUTES.length > 3 && (
                  <div className="text-[9px] text-gray-400 mt-1">+{FREQUENT_ROUTES.length - 3} more routes</div>
                )}
              </div>

              {/* Card 3: AI Suggested Upcoming Bookings */}
              <div className="p-4 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={14} className="text-purple-500" />
                  <h4 className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Suggested Bookings</h4>
                </div>
                <div className="space-y-2.5">
                  {SUGGESTED_BOOKINGS.slice(0, 3).map((s) => (
                    <div key={s.lane} className="group">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono font-semibold text-gray-800">{s.lane}</span>
                        <span className="text-[9px] font-medium text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{s.mode}</span>
                        <span className="ml-auto text-[10px] font-mono text-gray-400">{s.estRate}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-snug mb-0.5 line-clamp-2">{s.reason}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-gray-400 truncate">{s.carrier}</span>
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          <TrendingUp size={9} className="text-green-500" />
                          <span className="text-[9px] font-medium text-green-600">{s.confidence}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {SUGGESTED_BOOKINGS.length > 3 && (
                  <div className="text-[9px] text-gray-400 mt-1">+{SUGGESTED_BOOKINGS.length - 3} more suggestion{SUGGESTED_BOOKINGS.length - 3 > 1 ? "s" : ""}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── 2. Agent Activity Feed ────────────────────────────────────── */}
        <AgentActivityLog
          condensed
          maxItems={3}
          onShipmentClick={(id) => {
            const s = SHIPMENTS.find((sh) => sh.id === id)
            if (s) setSelectedShipment(s)
          }}
          onViewAll={() => onViewChange?.("agent-activity")}
        />

        {/* ── 3. Charts Row: Funnel + Exception Donut + Rate Variance ── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Agent Workflow Funnel */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-100">
              <Brain size={13} className={`text-indigo-600 shrink-0 ${analysisThinking ? "animate-pulse" : ""}`} />
              <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Workflow Funnel</span>
            </div>
            {analysisThinking ? (
              <div className="flex items-center gap-1.5 px-4 py-6">
                <span className="text-xs text-indigo-600 font-medium">Analyzing pipeline</span>
                <ThinkingDots />
              </div>
            ) : (
              <div className="px-3 pt-2 pb-1">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={funnelData}
                    margin={{ top: 6, right: 8, bottom: 28, left: 0 }}
                    barCategoryGap="25%"
                  >
                    <XAxis
                      dataKey="stage"
                      tick={{ fontSize: 9, fill: "#6B7280" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => {
                        const map: Record<string, string> = {
                          "SAP Ingested": "Ingested",
                          "Validated": "Validated",
                          "Carrier Selected": "Carrier Sel.",
                          "Portal Login": "Portal Login",
                          "Submitted": "Submitted",
                          "Confirmed": "Confirmed",
                          "Exception": "Exception",
                        }
                        return map[v] ?? v
                      }}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} allowDecimals={false} width={20} />
                    <Tooltip
                      cursor={{ fill: "#f3f4f6" }}
                      formatter={(v: number, _: string, props: { payload?: { stage?: string } }) => [`${v} bookings`, props?.payload?.stage ?? ""]}
                      contentStyle={{ fontSize: 11, padding: "4px 10px" }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
                      {funnelData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Exception Distribution Donut */}
          <div
            className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:border-blue-300 transition-colors flex flex-col"
            onClick={() => onViewChange?.("exceptions")}
            title="Click to open Exception Workbench"
          >
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 whitespace-nowrap">Exception Distribution</h3>
            {/* Donut — centered, compact */}
            <div className="w-full" style={{ height: 90 }}>
              <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={exceptionData.filter((e) => e.count > 0)}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={24}
                      outerRadius={40}
                      paddingAngle={3}
                    >
                      {exceptionData.filter((e) => e.count > 0).map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number, n: string) => [v, n]} contentStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
            </div>
            {/* Legend — stacked below donut */}
            <div className="space-y-1 mt-1">
              {exceptionData.filter((e) => e.count > 0).map((e) => (
                <div key={e.type} className="flex items-center justify-between text-[9px]">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: e.color }} />
                    <span className="text-gray-500 truncate">{e.type}</span>
                  </div>
                  <span className="font-semibold text-gray-700 shrink-0 ml-1">{e.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contract vs Spot Rate Variance */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 whitespace-nowrap">Rate Variance ($)</h3>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={rateVariance} margin={{ left: 0, right: 8 }}>
                <XAxis dataKey="carrier" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "#f3f4f6" }}
                  formatter={(v: number, n: string) => [`$${v.toLocaleString()}`, n === "contract" ? "Contract" : "Spot"]}
                  contentStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="contract" radius={[4, 4, 0, 0]} fill="#3b82f6" name="contract" maxBarSize={16} />
                <Bar dataKey="spot" radius={[4, 4, 0, 0]} fill="#f59e0b" name="spot" maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" /> Contract</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" /> Spot</span>
            </div>
          </div>
        </div>

        {/* ── 4. Hero KPI Strip + Portal Health ────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
          <HeroKPI
            label="Active Bookings"
            value={BOOKING_REQUESTS.length}
            icon={<Activity size={16} />}
            accent="blue"
          />
          <HeroKPI
            label="Exceptions Open"
            value={exceptionsCount}
            icon={<AlertTriangle size={16} />}
            accent="red"
            onClick={() => onViewChange?.("exceptions")}
          />
          <HeroKPI
            label="Zero-Touch Rate"
            value={`${zeroTouchRate}%`}
            icon={<CheckCircle2 size={16} />}
            accent="green"
          />
          <HeroKPI
            label="Avg Resolution Time"
            value="2.4h"
            icon={<Clock size={16} />}
            accent="indigo"
          />
        </div>

        {/* Portal Health Strip */}
        <div
          className="bg-white rounded-lg border border-gray-200 px-4 py-2.5 flex items-center gap-x-5 gap-y-1.5 flex-wrap cursor-pointer hover:border-blue-300 transition-colors"
          onClick={() => onViewChange?.("weather-traffic")}
          title="Click to view Portal Status"
        >
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider shrink-0">Portal Health</span>
          <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap flex-1">
            {PORTAL_STATUSES.map((p) => {
              const textColor = p.status === "Online" ? "text-green-600" : p.status === "Degraded" ? "text-amber-600 font-semibold" : "text-red-600 font-semibold"
              return (
                <div key={p.portal} className="flex items-center gap-1.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", PORTAL_DOT[p.status] || "bg-gray-400")} />
                  <span className="text-[11px] text-gray-700 font-medium whitespace-nowrap">{p.carrier}</span>
                  <span className={cn("text-[9px]", textColor)}>{p.status}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── 5. Map + Table (2-col: map left, table right) ────────────── */}
        <div className="grid grid-cols-3 gap-4 items-start">
          <div className="col-span-1" style={{ height: 297 }}>
            <MiniMap onShipmentClick={setSelectedShipment} />
          </div>
          <div className="col-span-2 overflow-y-auto rounded-lg" style={{ height: 297 }}>
            <ShipmentTable
              searchQuery={searchQuery}
              activeFilter={activeFilter}
              onSelectShipment={setSelectedShipment}
              selectedId={selectedShipment?.id ?? null}
            />
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedShipment && (
        <ShipmentDrawer
          shipment={selectedShipment}
          onClose={() => { setSelectedShipment(null); setBookingMode(false); if (demoActive) onDemoStepAdvance?.(0) }}
          onOpenWeather={onOpenWeather}
          onSendNotification={onSendNotification}
          onEtaApproved={onEtaApproved}
          bookingMode={bookingMode}
          demoStep={demoStep}
          demoPaused={demoPaused}
          demoScenario={demoScenario}
          demoExceptionActive={demoExceptionActive}
          onDemoStepAdvance={onDemoStepAdvance}
          onDemoPause={onDemoPause}
          onDemoResume={onDemoResume}
          onDemoExceptionResolved={onDemoExceptionResolved}
          onDemoExceptionTriggered={onDemoExceptionTriggered}
          onDemoComplete={onDemoComplete}
          onAddInboxEmail={onAddInboxEmail}
          onNavigateView={(v) => {
            if (v === "sap-tm") {
              onViewChange?.("sap-tm" as any, { sapOrderId: "SAP-TM-87234" } as any)
            } else if (v === "email-sent") {
              onViewChange?.("email-sent" as any, { emailId: "latest" } as any)
            } else {
              onViewChange?.(v as any)
            }
          }}
        />
      )}

      {/* Completion Modal */}
      <CompletionModal
        open={showCompletionModal ?? false}
        onClose={onCloseCompletionModal ?? (() => {})}
        elapsedTime={demoElapsedTime ?? "0s"}
      />
    </div>
  )
}

// ── Hero KPI Card ───────────────────────────────────────────────────────────

const ACCENT_COLORS = {
  blue: { border: "border-l-blue-500", value: "text-blue-700", icon: "text-blue-500" },
  red: { border: "border-l-red-500", value: "text-red-700", icon: "text-red-500" },
  green: { border: "border-l-green-500", value: "text-green-700", icon: "text-green-500" },
  indigo: { border: "border-l-indigo-500", value: "text-indigo-700", icon: "text-indigo-500" },
}

function HeroKPI({
  label, value, icon, accent, onClick,
}: {
  label: string; value: number | string; icon: React.ReactNode; accent: keyof typeof ACCENT_COLORS; onClick?: () => void
}) {
  const colors = ACCENT_COLORS[accent]
  const Tag = onClick ? "button" : "div"

  return (
    <Tag
      onClick={onClick}
      className={cn(
        "bg-white rounded-lg border border-gray-200 border-l-[3px] px-4 py-3 text-left transition-colors",
        colors.border,
        onClick && "cursor-pointer hover:shadow-sm hover:border-gray-300"
      )}
    >
      <div className="flex items-start gap-2 mb-1">
        <span className={cn("shrink-0 mt-0.5", colors.icon)}>{icon}</span>
        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide leading-tight">{label}</span>
      </div>
      <div className={cn("text-2xl font-bold leading-none mt-1", colors.value)}>{value}</div>
    </Tag>
  )
}
