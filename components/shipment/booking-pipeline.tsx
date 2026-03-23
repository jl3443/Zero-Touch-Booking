"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import {
  BOOKING_REQUESTS,
  SIMULATION_BOOKING,
  type BookingRequest,
  type BookingStatus,
  type BookingExceptionType,
} from "@/lib/mock-data"
import { type SimulationPhase } from "./app-shell"
import { ShipmentDrawer } from "./shipment-drawer"
import { ModeIcon, CarrierBadge, SeverityBadge } from "./shared"
import { type SentEmailItem } from "./email-sent-page"
import { type SidebarView } from "./sidebar"
import {
  Columns3, Clock, CheckCircle2, AlertTriangle,
  ArrowRight, Loader2, Zap, ChevronRight, Minus, Brain, Ship,
  X, Wrench, RotateCcw, Shield, Search,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Pipeline column definitions ─────────────────────────────────────────────

interface PipelineColumn {
  id: string
  label: string
  statuses: BookingStatus[]
  color: string        // header accent
  bgColor: string      // column background
  borderColor: string  // bottleneck card accent
  group: "flow" | "exception"
}

const PIPELINE_COLUMNS: PipelineColumn[] = [
  {
    id: "ingested",
    label: "SAP Ingested",
    statuses: ["Pending", "In Progress"],
    color: "bg-blue-500",
    bgColor: "bg-blue-50/40",
    borderColor: "border-l-blue-500",
    group: "flow",
  },
  {
    id: "carrier-selected",
    label: "Carrier Selected",
    statuses: ["Carrier Selected"],
    color: "bg-indigo-500",
    bgColor: "bg-indigo-50/40",
    borderColor: "border-l-indigo-500",
    group: "flow",
  },
  {
    id: "portal-login",
    label: "Portal Login",
    statuses: ["Portal Login"],
    color: "bg-cyan-500",
    bgColor: "bg-cyan-50/40",
    borderColor: "border-l-cyan-500",
    group: "flow",
  },
  {
    id: "submitted",
    label: "Submitted",
    statuses: ["Booking Submitted"],
    color: "bg-sky-500",
    bgColor: "bg-sky-50/40",
    borderColor: "border-l-sky-500",
    group: "flow",
  },
  {
    id: "docs",
    label: "Docs Uploaded",
    statuses: ["Docs Uploaded"],
    color: "bg-violet-500",
    bgColor: "bg-violet-50/40",
    borderColor: "border-l-violet-500",
    group: "flow",
  },
  {
    id: "confirmed",
    label: "Confirmed",
    statuses: ["Confirmed", "Notified"],
    color: "bg-green-500",
    bgColor: "bg-green-50/40",
    borderColor: "border-l-green-500",
    group: "flow",
  },
  {
    id: "exception",
    label: "Exception",
    statuses: ["Exception"],
    color: "bg-red-500",
    bgColor: "bg-red-50/40",
    borderColor: "border-l-red-500",
    group: "exception",
  },
  {
    id: "approval",
    label: "Awaiting Approval",
    statuses: ["Awaiting Approval"],
    color: "bg-amber-500",
    bgColor: "bg-amber-50/40",
    borderColor: "border-l-amber-500",
    group: "exception",
  },
]

// Workflow steps in order (for progress dots)
const WORKFLOW_STEPS = ["SAP Ingest", "Carrier Select", "Portal Login", "Submit", "Docs Upload", "Confirm"]

// ── Exception Resolution Data ───────────────────────────────────────────────

interface ResolutionData {
  diagnosis: string
  rootCause: string
  aiAction: string
  resolvedCarrier: string
  resolvedRate: number
  resolvedTransit: number
  steps: Array<{ label: string; detail: string }>
}

const EXCEPTION_RESOLUTIONS: Record<string, ResolutionData> = {
  "Missing Allocation": {
    diagnosis: "All 4 contracted carriers at full capacity on this lane.",
    rootCause: "Peak season demand surge — allocation exhausted for current sailing window.",
    aiAction: "Spot market search initiated. Found MSC capacity via Colombo transshipment.",
    resolvedCarrier: "MSC",
    resolvedRate: 2100,
    resolvedTransit: 22,
    steps: [
      { label: "Spot Market Scan", detail: "Checked 6 additional carriers on spot market" },
      { label: "Route Optimization", detail: "Alternative route via Colombo identified — MSC available" },
      { label: "Rate Negotiation", detail: "Spot rate $2,100 negotiated (within 10% of contract)" },
      { label: "Allocation Secured", detail: "MSC confirmed slot on next available sailing" },
    ],
  },
  "Carrier Rejection": {
    diagnosis: "Carrier rejected booking — vessel capacity exceeded for requested sailing.",
    rootCause: "Maersk overbooked vessel MAA→IAH route, no rollover slots available.",
    aiAction: "Re-routing to MSC with next available sailing (+2 days). Rate within contract.",
    resolvedCarrier: "MSC",
    resolvedRate: 2650,
    resolvedTransit: 16,
    steps: [
      { label: "Rejection Analysis", detail: "Maersk rejection code: VESSEL_FULL — no rollover option" },
      { label: "Carrier Re-evaluation", detail: "Scored 3 alternate carriers on MAA→IAH lane" },
      { label: "MSC Selected", detail: "MSC Gaia — next sailing Mar 18, capacity confirmed" },
      { label: "Booking Re-submitted", detail: "New booking submitted to MSC portal — Ref MSC-881205" },
    ],
  },
  "Portal Unavailable": {
    diagnosis: "Carrier portal unreachable after 3 API retries + RPA fallback attempt.",
    rootCause: "CMA-CGM API gateway maintenance window — scheduled downtime detected.",
    aiAction: "Switched to EDI submission channel. Booking submitted via backup EDI/IFTMIN.",
    resolvedCarrier: "CMA-CGM",
    resolvedRate: 1850,
    resolvedTransit: 3,
    steps: [
      { label: "Retry Exhausted", detail: "3 API attempts + 1 RPA attempt — all timed out" },
      { label: "Downtime Detection", detail: "CMA-CGM status page: scheduled maintenance until 06:00 UTC" },
      { label: "Fallback Channel", detail: "EDI/IFTMIN message prepared and transmitted" },
      { label: "EDI Confirmed", detail: "Booking acknowledged via EDI IFTMBC response" },
    ],
  },
  "Rate Mismatch": {
    diagnosis: "Spot rate 19% above contract rate — exceeds auto-approval threshold (10%).",
    rootCause: "Capacity squeeze on BOM→LAX caused spot market premium.",
    aiAction: "Negotiated rate reduction to $3,400 (6% above contract). Within approval limit.",
    resolvedCarrier: "CMA-CGM",
    resolvedRate: 3400,
    resolvedTransit: 18,
    steps: [
      { label: "Rate Analysis", detail: "Spot $3,800 vs Contract $3,200 — 19% variance flagged" },
      { label: "Auto-Negotiate", detail: "AI counter-offer submitted at $3,300 via rate API" },
      { label: "Counter Accepted", detail: "CMA-CGM accepted $3,400 — 6% above contract (within 10% limit)" },
      { label: "Rate Locked", detail: "Amended rate confirmed and booking updated" },
    ],
  },
  "Missing Booking Fields": {
    diagnosis: "3 mandatory fields missing from SAP export — booking blocked.",
    rootCause: "SAP TM export template missing cargo_weight, commodity_code, and ready_date.",
    aiAction: "Auto-populated missing fields from historical data + SAP WM cross-reference.",
    resolvedCarrier: "Hapag-Lloyd",
    resolvedRate: 2950,
    resolvedTransit: 21,
    steps: [
      { label: "Field Validation", detail: "Missing: cargo_weight, commodity_code, ready_date" },
      { label: "Data Recovery", detail: "Matched SAP WM records — weight: 14,200 kg, HS: 8471.30" },
      { label: "Cross-Reference", detail: "Ready date inferred from production schedule: Mar 18" },
      { label: "Fields Populated", detail: "All 3 fields auto-filled and validated against schema" },
    ],
  },
  "Credentials Expired": {
    diagnosis: "CMA-CGM API token expired mid-booking submission.",
    rootCause: "OAuth refresh token rotation missed by credential manager.",
    aiAction: "Credential vault refreshed. New API token issued. Booking session resumed.",
    resolvedCarrier: "CMA-CGM",
    resolvedRate: 2800,
    resolvedTransit: 19,
    steps: [
      { label: "Auth Failure", detail: "401 Unauthorized — token expired at 04:06 UTC" },
      { label: "Vault Refresh", detail: "Credential manager triggered OAuth re-authentication" },
      { label: "Token Issued", detail: "New bearer token valid until Mar 20 06:00 UTC" },
      { label: "Session Resumed", detail: "Booking form re-loaded with pre-filled data — no data loss" },
    ],
  },
}

// Resolution phase type (per-booking)
type ResolutionPhase =
  | "modal-open"      // Modal showing diagnosis
  | "resolving"       // AI fixing animation
  | "resolved"        // Fix applied, ready to proceed
  | "animating"       // Card moving through pipeline stages
  | "done"            // Card reached Confirmed

// Status sequence for the animation (from re-entry point to Confirmed)
const HAPPY_PATH_STATUSES: BookingStatus[] = [
  "Carrier Selected",
  "Portal Login",
  "Booking Submitted",
  "Docs Uploaded",
  "Confirmed",
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStepProgress(booking: BookingRequest): number {
  const completed = booking.workflowSteps.filter((s) => s.status === "completed").length
  return completed
}

function getTimeInStage(booking: BookingRequest): string {
  const activeStep = booking.workflowSteps.find((s) => s.status === "active" || s.status === "failed")
  if (!activeStep?.timestamp) {
    const last = [...booking.workflowSteps].reverse().find((s) => s.timestamp)
    if (!last?.timestamp) return "—"
    return formatDuration(last.timestamp)
  }
  return formatDuration(activeStep.timestamp)
}

function formatDuration(timestamp: string): string {
  const match = timestamp.match(/(\w+)\s+(\d+),?\s+(\d{2}):(\d{2})/)
  if (!match) return "—"
  const [, mon, day, hr, min] = match
  const months: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }
  const d = new Date(2025, months[mon] ?? 2, parseInt(day), parseInt(hr), parseInt(min))
  const now = new Date(2025, 2, 13, 23, 59)
  const diffMs = now.getTime() - d.getTime()
  if (diffMs < 0) return "<1m"
  const diffH = Math.floor(diffMs / 3600000)
  const diffM = Math.floor((diffMs % 3600000) / 60000)
  if (diffH >= 24) return `${Math.floor(diffH / 24)}d ${diffH % 24}h`
  if (diffH > 0) return `${diffH}h ${diffM}m`
  return `${diffM}m`
}

function getBottleneckLevel(booking: BookingRequest): "none" | "warning" | "critical" {
  if (booking.bookingStatus === "Confirmed" || booking.bookingStatus === "Notified") return "none"
  const activeStep = booking.workflowSteps.find((s) => s.status === "active" || s.status === "failed")
  if (!activeStep?.timestamp) return "none"
  const match = activeStep.timestamp.match(/(\w+)\s+(\d+),?\s+(\d{2}):(\d{2})/)
  if (!match) return "none"
  const [, mon, day, hr, min] = match
  const months: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }
  const d = new Date(2025, months[mon] ?? 2, parseInt(day), parseInt(hr), parseInt(min))
  const now = new Date(2025, 2, 13, 23, 59)
  const diffH = (now.getTime() - d.getTime()) / 3600000
  if (diffH >= 4) return "critical"
  if (diffH >= 2) return "warning"
  return "none"
}

// ── Thinking Dots ────────────────────────────────────────────────────────────

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

// ── Progress Dots ────────────────────────────────────────────────────────────

function ProgressDots({ completed, total = 6 }: { completed: number; total?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 h-1.5 rounded-full transition-colors",
            i < completed ? "bg-green-500" : "bg-gray-200"
          )}
        />
      ))}
    </div>
  )
}

// ── Collapsed Empty Column ──────────────────────────────────────────────────

function CollapsedColumn({ col }: { col: PipelineColumn }) {
  return (
    <div className="w-[52px] flex-shrink-0">
      <div className={cn("rounded-lg px-1.5 py-2 flex flex-col items-center gap-2 min-h-[120px]", col.bgColor)}>
        <div className={cn("w-2 h-2 rounded-full", col.color)} />
        <span className="text-[9px] font-semibold text-gray-400 [writing-mode:vertical-lr] rotate-180 tracking-wide">
          {col.label}
        </span>
        <span className="text-[9px] font-medium text-gray-300 mt-auto">0</span>
      </div>
    </div>
  )
}

// ── Confirmed Card (compact) ────────────────────────────────────────────────

function ConfirmedCard({ booking, onClick, isSimulation, isResolved }: { booking: BookingRequest; onClick: () => void; isSimulation?: boolean; isResolved?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white border border-green-100 rounded-lg p-2 cursor-pointer hover:shadow-sm transition-all border-l-[3px] border-l-green-500",
        isSimulation && "ring-2 ring-green-400/60",
        isResolved && "ring-2 ring-emerald-400/60"
      )}
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 size={12} className="text-green-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-900">{booking.id}</span>
              {isSimulation && (
                <span className="text-[8px] font-bold text-white bg-green-500 rounded px-1 py-[1px] uppercase tracking-wider">Done</span>
              )}
              {isResolved && (
                <span className="text-[8px] font-bold text-white bg-emerald-500 rounded px-1 py-[1px] uppercase tracking-wider">Resolved</span>
              )}
            </div>
            <ModeIcon mode={booking.mode} size={10} />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-gray-500">{booking.lane}</span>
            <span className="text-[10px] text-gray-300">·</span>
            <span className="text-[10px] text-gray-500">{booking.carrier}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Exception Card (compact + expandable) ───────────────────────────────────

function ExceptionCardCompact({
  booking, col, isExpanded, onExpand, onOpenDrawer, onViewChange, onResolve,
}: {
  booking: BookingRequest
  col: PipelineColumn
  isExpanded: boolean
  onExpand: () => void
  onOpenDrawer: () => void
  onViewChange?: (view: SidebarView) => void
  onResolve?: () => void
}) {
  const bottleneck = getBottleneckLevel(booking)
  const borderClass = col.id === "exception" ? "border-l-red-500" : "border-l-amber-500"

  if (!isExpanded) {
    // ── Compact view (like Confirmed cards) ──
    return (
      <div
        onClick={onExpand}
        className={cn(
          "bg-white border rounded-lg p-2 cursor-pointer hover:shadow-sm transition-all border-l-[3px]",
          borderClass,
          bottleneck === "critical" ? "border-red-200" : bottleneck === "warning" ? "border-amber-200" : "border-gray-200"
        )}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={11} className={col.id === "exception" ? "text-red-500 shrink-0" : "text-amber-500 shrink-0"} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-900">{booking.id}</span>
              <SeverityBadge severity={booking.severity} />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-gray-500">{booking.lane}</span>
              <span className="text-[10px] text-gray-300">·</span>
              <span className="text-[10px] text-gray-500 truncate">{booking.exceptionType !== "None" ? booking.exceptionType : booking.carrier}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Expanded view (full details) ──
  return (
    <div
      className={cn(
        "bg-white border rounded-lg p-2.5 transition-all border-l-[3px] shadow-sm",
        borderClass,
        bottleneck === "critical" ? "border-red-200" : bottleneck === "warning" ? "border-amber-200" : "border-gray-200"
      )}
    >
      {/* Header: ID + severity */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-gray-900">{booking.id}</span>
        <SeverityBadge severity={booking.severity} />
      </div>

      {/* Lane + Mode */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-gray-600">{booking.lane}</span>
        <ModeIcon mode={booking.mode} size={12} />
      </div>

      {/* Carrier */}
      <div className="mb-1.5">
        <CarrierBadge carrier={booking.carrier} />
      </div>

      {/* Exception type */}
      {booking.exceptionType !== "None" && (
        <div className="text-[10px] font-medium text-red-600 bg-red-50 rounded px-1.5 py-0.5 mb-1.5 truncate">
          {booking.exceptionType}
        </div>
      )}

      {/* Progress dots + time */}
      <div className="flex items-center justify-between mb-1">
        <ProgressDots completed={getStepProgress(booking)} />
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Clock size={9} />
          <span>{getTimeInStage(booking)}</span>
        </div>
      </div>

      {/* Bottleneck warning */}
      {bottleneck !== "none" && (
        <div className={cn(
          "text-[9px] font-medium px-1.5 py-0.5 rounded mb-1.5",
          bottleneck === "critical" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
        )}>
          {bottleneck === "critical" ? "Bottleneck detected" : "Slow progress"}
        </div>
      )}

      {/* Action buttons — both open the Resolution Modal for consistency */}
      <div className="flex gap-1.5 mt-1">
        <button
          onClick={onResolve || onOpenDrawer}
          className="flex-1 text-[9px] font-medium text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded px-1.5 py-1 flex items-center justify-center gap-1 transition-colors cursor-pointer"
        >
          View Details
        </button>
        {onResolve && (
          <button
            onClick={(e) => { e.stopPropagation(); onResolve() }}
            className="flex-1 text-[9px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded px-1.5 py-1 flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Wrench size={8} /> AI Resolve
          </button>
        )}
      </div>
    </div>
  )
}

// ── Standard Card ───────────────────────────────────────────────────────────

function StandardCard({
  booking, col, onClick, isSimulation, isResolving,
}: {
  booking: BookingRequest
  col: PipelineColumn
  onClick: () => void
  isSimulation?: boolean
  isResolving?: boolean
}) {
  const bottleneck = getBottleneckLevel(booking)
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white border rounded-lg p-2.5 cursor-pointer hover:shadow-sm transition-all duration-500 border-l-[3px]",
        isSimulation && "ring-2 ring-indigo-400/60 animate-pulse",
        isResolving && "ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-100 scale-[1.02]",
        bottleneck === "critical"
          ? "border-l-red-500 border-red-200"
          : bottleneck === "warning"
          ? "border-l-amber-400 border-amber-200"
          : `${col.borderColor} border-gray-200`
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-gray-900">{booking.id}</span>
          {isSimulation && (
            <span className="text-[8px] font-bold text-white bg-red-500 rounded px-1 py-[1px] uppercase tracking-wider animate-pulse">Live</span>
          )}
          {isResolving && (
            <span className="text-[8px] font-bold text-white bg-emerald-500 rounded px-1 py-[1px] uppercase tracking-wider animate-pulse">Resolving</span>
          )}
        </div>
        <ModeIcon mode={booking.mode} size={12} />
      </div>

      <div className="text-[11px] font-semibold text-gray-600 mb-1">
        {booking.lane}
      </div>

      <div className="mb-1.5">
        <CarrierBadge carrier={booking.carrier} />
      </div>

      {/* Progress dots + time */}
      <div className="flex items-center justify-between">
        <ProgressDots completed={getStepProgress(booking)} />
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Clock size={9} />
          <span>{getTimeInStage(booking)}</span>
        </div>
      </div>

      {bottleneck !== "none" && (
        <div className={cn(
          "mt-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded",
          bottleneck === "critical" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
        )}>
          {bottleneck === "critical" ? "Bottleneck detected" : "Slow progress"}
        </div>
      )}
    </div>
  )
}

// ── Resolution Visual Sub-Components ─────────────────────────────────────────

// 1. Missing Allocation — carrier capacity table + spot market scan
function MissingAllocationVisual({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0) // 0=show table, 1=scanning, 2=spot results, 3=evaluating, 4=selected
  const [spotVisible, setSpotVisible] = useState(0) // 0-3 spot rows visible
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const contracted = [
    { carrier: "Maersk", rate: 2400, transit: 18, capacity: "Full" },
    { carrier: "MSC", rate: 2350, transit: 20, capacity: "Full" },
    { carrier: "Hapag-Lloyd", rate: 2500, transit: 17, capacity: "Full" },
    { carrier: "CMA-CGM", rate: 2300, transit: 19, capacity: "Full" },
  ]
  const spot = [
    { carrier: "MSC", via: "via Colombo", rate: 2100, transit: 22, capacity: "Available", selected: true },
    { carrier: "Evergreen", via: "direct", rate: 2400, transit: 25, capacity: "Limited", selected: false },
    { carrier: "Yang Ming", via: "via Singapore", rate: 2550, transit: 24, capacity: "Available", selected: false },
  ]

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => { setPhase(2); setSpotVisible(1) }, 2000),
      setTimeout(() => setSpotVisible(2), 2600),
      setTimeout(() => setSpotVisible(3), 3200),
      setTimeout(() => setPhase(3), 4000),
      setTimeout(() => setPhase(4), 5500),
      setTimeout(() => onCompleteRef.current(), 7000),
    ]
    return () => timers.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="rounded-xl border border-indigo-200 bg-white px-5 py-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={14} className="text-indigo-600 animate-pulse" />
        <span className="text-xs font-bold text-indigo-800">AI Agent — Carrier Allocation Search</span>
      </div>

      {/* Contracted carriers table */}
      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Contracted Carriers</div>
      <div className="space-y-1 mb-3">
        {contracted.map((c) => (
          <div key={c.carrier} className="flex items-center justify-between bg-red-50/60 border border-red-100 rounded-lg px-3 py-1.5">
            <span className="text-[11px] font-semibold text-gray-700 w-24">{c.carrier}</span>
            <span className="text-[10px] text-gray-500">${c.rate.toLocaleString()}</span>
            <span className="text-[10px] text-gray-500">{c.transit}d</span>
            <span className="text-[9px] font-bold text-red-600 bg-red-100 rounded px-1.5 py-0.5">FULL</span>
          </div>
        ))}
      </div>

      {/* Scanning indicator */}
      {phase >= 1 && phase < 2 && (
        <div className="flex items-center gap-2 py-3 justify-center text-indigo-600">
          <Search size={12} className="animate-pulse" />
          <span className="text-[11px] font-semibold">Scanning spot market...</span>
          <ThinkingDots />
        </div>
      )}

      {/* Spot market results */}
      {phase >= 2 && (
        <>
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 mt-2 pt-2 border-t border-gray-100">
            Spot Market Results
          </div>
          <div className="space-y-1">
            {spot.map((s, i) => {
              if (i >= spotVisible) return null
              const isSelected = phase >= 4 && s.selected
              const isFaded = phase >= 4 && !s.selected
              return (
                <div key={s.carrier + s.via} className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-1.5 transition-all duration-500 border",
                  isSelected ? "bg-green-50 border-green-300 ring-2 ring-green-400/50" :
                  isFaded ? "bg-gray-50 border-gray-100 opacity-50" :
                  phase === 3 ? "bg-indigo-50/40 border-indigo-200" :
                  "bg-green-50/40 border-green-100"
                )}>
                  <div className="w-24">
                    <span className={cn("text-[11px] font-semibold", isSelected ? "text-green-800" : "text-gray-700")}>{s.carrier}</span>
                    <div className="text-[9px] text-gray-400">{s.via}</div>
                  </div>
                  <span className="text-[10px] text-gray-600">${s.rate.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-500">{s.transit}d</span>
                  <span className={cn(
                    "text-[9px] font-bold rounded px-1.5 py-0.5",
                    s.capacity === "Available" ? "text-green-600 bg-green-100" : "text-amber-600 bg-amber-100"
                  )}>{s.capacity}</span>
                  {isSelected && (
                    <span className="text-[9px] font-bold text-white bg-green-600 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                      <CheckCircle2 size={8} /> SELECTED
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Evaluating indicator */}
      {phase === 3 && (
        <div className="flex items-center gap-2 py-2 justify-center text-indigo-600 mt-2">
          <Loader2 size={11} className="animate-spin" />
          <span className="text-[11px] font-semibold">Evaluating rate, SLA, and transit time...</span>
        </div>
      )}
    </div>
  )
}

// 2. Carrier Rejection — rejected card + 3 alternatives with score bars
function CarrierRejectionVisual({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0) // 0=show rejected, 1=show alts, 2=scoring, 3=selected
  const [altsVisible, setAltsVisible] = useState(0)
  const [scores, setScores] = useState([0, 0, 0])
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const alternatives = [
    { carrier: "MSC", vessel: "MSC Gaia", route: "MAA→IAH", transit: 16, rate: 2650, capacity: "Available", score: 94 },
    { carrier: "Hapag-Lloyd", vessel: "Hapag Express", route: "MAA→SIN→IAH", transit: 15, rate: 2800, capacity: "Available", score: 87 },
    { carrier: "CMA-CGM", vessel: "CMA Liberty", route: "MAA→IAH", transit: 19, rate: 2500, capacity: "Limited", score: 81 },
  ]

  useEffect(() => {
    const timers = [
      setTimeout(() => { setPhase(1); setAltsVisible(1) }, 1500),
      setTimeout(() => setAltsVisible(2), 2000),
      setTimeout(() => setAltsVisible(3), 2500),
      setTimeout(() => { setPhase(2); setScores([94, 87, 81]) }, 3500),
      setTimeout(() => setPhase(3), 5500),
      setTimeout(() => onCompleteRef.current(), 7000),
    ]
    return () => timers.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="rounded-xl border border-indigo-200 bg-white px-5 py-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={14} className="text-indigo-600 animate-pulse" />
        <span className="text-xs font-bold text-indigo-800">AI Agent — Alternate Route Selection</span>
      </div>

      {/* Rejected card */}
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-red-800 line-through">Maersk · MAA→IAH</span>
              <span className="text-[8px] font-bold text-white bg-red-500 rounded px-1.5 py-0.5">REJECTED</span>
            </div>
            <div className="text-[10px] text-red-600 mt-0.5">Code: VESSEL_FULL — No rollover slots available</div>
          </div>
          <X size={16} className="text-red-400" />
        </div>
      </div>

      {/* Alternatives */}
      {phase >= 1 && (
        <>
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            {phase < 2 ? "Evaluating Alternatives..." : phase < 3 ? "Scoring Carriers..." : "Route Selected"}
          </div>
          <div className="space-y-2">
            {alternatives.map((alt, i) => {
              if (i >= altsVisible) return null
              const isSelected = phase >= 3 && i === 0
              const isFaded = phase >= 3 && i !== 0
              return (
                <div key={alt.carrier} className={cn(
                  "rounded-lg border px-4 py-3 transition-all duration-500",
                  isSelected ? "border-green-300 bg-green-50 ring-2 ring-green-400/50 shadow-sm" :
                  isFaded ? "border-gray-100 bg-gray-50 opacity-50" :
                  "border-gray-200 bg-white"
                )}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[11px] font-bold", isSelected ? "text-green-800" : "text-gray-800")}>{alt.carrier}</span>
                      <span className="text-[10px] text-gray-400">{alt.vessel}</span>
                      {isSelected && (
                        <span className="text-[8px] font-bold text-white bg-green-600 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                          <CheckCircle2 size={7} /> SELECTED
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold rounded px-1.5 py-0.5",
                      alt.capacity === "Available" ? "text-green-600 bg-green-100" : "text-amber-600 bg-amber-100"
                    )}>{alt.capacity}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-gray-600 mb-2">
                    <span>{alt.route}</span>
                    <span>${alt.rate.toLocaleString()}</span>
                    <span>{alt.transit}d transit</span>
                  </div>
                  {/* Score bar */}
                  {phase >= 2 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-gray-400 w-8">Score</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            isSelected ? "bg-green-500" : isFaded ? "bg-gray-300" : "bg-indigo-500"
                          )}
                          style={{ width: `${scores[i]}%` }}
                        />
                      </div>
                      <span className={cn("text-[10px] font-bold", isSelected ? "text-green-700" : "text-gray-600")}>{scores[i]}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// 3. Portal Unavailable + Credentials Expired — connection log + fallback
function PortalUnavailableVisual({ variant, onComplete }: { variant: "portal" | "credentials"; onComplete: () => void }) {
  const [logIdx, setLogIdx] = useState(0) // 0-4 log entries visible
  const [phase, setPhase] = useState(0) // 0=logging, 1=downtime, 2=switching, 3=transmitted, 4=acknowledged
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const isCredentials = variant === "credentials"

  const logEntries = isCredentials
    ? [
      { method: "API", detail: "401 Unauthorized — bearer token expired", time: "04:06:12 UTC" },
      { method: "API", detail: "Token refresh attempted — rotation missed", time: "04:06:15 UTC" },
      { method: "API", detail: "Credential vault check — token stale since 02:00", time: "04:06:18 UTC" },
      { method: "Vault", detail: "OAuth re-authentication initiated", time: "04:06:20 UTC" },
    ]
    : [
      { method: "API", detail: "Connection timeout after 30s", time: "04:02:15 UTC" },
      { method: "API", detail: "Connection timeout after 30s", time: "04:02:48 UTC" },
      { method: "API", detail: "Connection timeout after 30s", time: "04:03:22 UTC" },
      { method: "RPA", detail: "Portal unresponsive — fallback failed", time: "04:03:55 UTC" },
    ]

  const downtimeMsg = isCredentials
    ? "OAuth token expired — credential manager rotation missed at 02:00 UTC"
    : "CMA-CGM status page: scheduled maintenance until 06:00 UTC"

  const fallbackLabel = isCredentials ? "Re-authenticating..." : "Switching to EDI/IFTMIN..."
  const successLabel = isCredentials ? "New Token Issued" : "EDI Transmitted"
  const successDetail = isCredentials ? "Bearer token valid until Mar 20 06:00 UTC" : "IFTMIN message ID: EDI-88204-NGB"
  const ackLabel = isCredentials ? "Session Resumed" : "Booking Acknowledged"
  const ackDetail = isCredentials ? "Booking form re-loaded — no data loss" : "IFTMBC response — Ref: CMAU-660441"

  useEffect(() => {
    const timers = [
      setTimeout(() => setLogIdx(1), 400),
      setTimeout(() => setLogIdx(2), 800),
      setTimeout(() => setLogIdx(3), 1200),
      setTimeout(() => setLogIdx(4), 1600),
      setTimeout(() => setPhase(1), 2200),
      setTimeout(() => setPhase(2), 3200),
      setTimeout(() => setPhase(3), 4500),
      setTimeout(() => setPhase(4), 5800),
      setTimeout(() => onCompleteRef.current(), 7000),
    ]
    return () => timers.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="rounded-xl border border-indigo-200 bg-white px-5 py-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={14} className="text-indigo-600 animate-pulse" />
        <span className="text-xs font-bold text-indigo-800">
          AI Agent — {isCredentials ? "Credential Recovery" : "Connection Fallback"}
        </span>
      </div>

      {/* Connection log */}
      <div className="bg-gray-900 rounded-lg px-4 py-3 mb-3 font-mono">
        <div className="text-[9px] text-gray-500 mb-2">Connection Log</div>
        <div className="space-y-1">
          {logEntries.map((entry, i) => {
            if (i >= logIdx) return null
            return (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <X size={9} className="text-red-400 shrink-0" />
                <span className="text-gray-500">{entry.time}</span>
                <span className="text-red-400 font-semibold w-8">{entry.method}</span>
                <span className="text-gray-300">{entry.detail}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Downtime detection */}
      {phase >= 1 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-3 flex items-start gap-2">
          <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-[10px] font-bold text-amber-800">
              {isCredentials ? "Credential Issue Detected" : "Downtime Detected"}
            </div>
            <div className="text-[10px] text-amber-700">{downtimeMsg}</div>
          </div>
        </div>
      )}

      {/* Fallback channel */}
      {phase >= 2 && (
        <div className={cn(
          "border rounded-lg px-4 py-3 mb-3 transition-all",
          phase >= 3 ? "bg-green-50 border-green-200" : "bg-indigo-50 border-indigo-200"
        )}>
          {phase === 2 && (
            <div className="flex items-center gap-2 text-indigo-700">
              <Loader2 size={11} className="animate-spin" />
              <span className="text-[11px] font-semibold">{fallbackLabel}</span>
              <div className="flex-1 h-1.5 bg-indigo-200 rounded-full overflow-hidden ml-2">
                <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: "60%" }} />
              </div>
            </div>
          )}
          {phase >= 3 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={11} className="text-green-600" />
                <span className="text-[11px] font-bold text-green-800">{successLabel}</span>
              </div>
              <div className="text-[10px] text-green-700 ml-5">{successDetail}</div>
            </div>
          )}
          {phase >= 4 && (
            <div className="mt-2 pt-2 border-t border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={11} className="text-green-600" />
                <span className="text-[11px] font-bold text-green-800">{ackLabel}</span>
              </div>
              <div className="text-[10px] text-green-700 ml-5">{ackDetail}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 4. Rate Mismatch — rate comparison + negotiation chat
function RateMismatchVisual({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0) // 0=show rates, 1-4=negotiation steps, 5=locked
  const [displayRate, setDisplayRate] = useState(3800)
  const [displayVariance, setDisplayVariance] = useState(19)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const contractRate = 3200
  const negotiationSteps = [
    { dir: "out", label: "Counter-offer submitted", rate: 3300, status: "sent" },
    { dir: "in", label: "Carrier response", rate: 3500, status: "rejected" },
    { dir: "out", label: "Revised offer", rate: 3350, status: "sent" },
    { dir: "in", label: "CMA-CGM accepted", rate: 3400, status: "accepted" },
  ]

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1500),
      setTimeout(() => setPhase(2), 3000),
      setTimeout(() => setPhase(3), 4000),
      setTimeout(() => {
        setPhase(4)
        setDisplayRate(3400)
        setDisplayVariance(6)
      }, 5000),
      setTimeout(() => setPhase(5), 6000),
      setTimeout(() => onCompleteRef.current(), 7000),
    ]
    return () => timers.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="rounded-xl border border-indigo-200 bg-white px-5 py-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain size={14} className="text-indigo-600 animate-pulse" />
        <span className="text-xs font-bold text-indigo-800">AI Agent — Rate Negotiation</span>
      </div>

      {/* Rate comparison */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
          <div className="text-[9px] font-bold text-green-600 uppercase tracking-wider">Contract Rate</div>
          <div className="text-xl font-bold text-green-800">${contractRate.toLocaleString()}</div>
        </div>
        <div className={cn(
          "rounded-full px-2.5 py-1 text-[10px] font-bold text-white shrink-0 transition-colors duration-500",
          displayVariance <= 10 ? "bg-green-500" : "bg-red-500"
        )}>
          +{displayVariance}%
        </div>
        <div className={cn(
          "flex-1 border rounded-lg px-4 py-3 text-center transition-all duration-500",
          displayRate <= 3400 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
        )}>
          <div className={cn(
            "text-[9px] font-bold uppercase tracking-wider transition-colors",
            displayRate <= 3400 ? "text-green-600" : "text-red-600"
          )}>
            {displayRate <= 3400 ? "Negotiated Rate" : "Spot Rate"}
          </div>
          <div className={cn(
            "text-xl font-bold transition-colors duration-500",
            displayRate <= 3400 ? "text-green-800" : "text-red-800"
          )}>
            ${displayRate.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Threshold bar */}
      <div className="mb-4 px-1">
        <div className="flex items-center justify-between text-[9px] text-gray-400 mb-1">
          <span>0%</span>
          <span className="font-semibold text-amber-600">10% threshold</span>
          <span>25%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full relative overflow-hidden">
          <div className="absolute left-0 top-0 h-full bg-green-200 rounded-l-full" style={{ width: "40%" }} />
          <div className="absolute top-0 h-full bg-red-200 rounded-r-full" style={{ left: "40%", width: "60%" }} />
          <div className="absolute top-0 h-full w-0.5 bg-amber-500" style={{ left: "40%" }} />
          <div
            className={cn(
              "absolute top-0 h-full w-2 rounded-full transition-all duration-700 shadow-sm",
              displayVariance <= 10 ? "bg-green-600" : "bg-red-600"
            )}
            style={{ left: `${Math.min((displayVariance / 25) * 100, 96)}%` }}
          />
        </div>
      </div>

      {/* Negotiation steps */}
      {phase >= 1 && (
        <div className="space-y-2">
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">AI Negotiation</div>
          {negotiationSteps.map((step, i) => {
            if (i >= phase) return null
            const isAccepted = step.status === "accepted"
            const isRejected = step.status === "rejected"
            return (
              <div key={i} className={cn(
                "flex items-center gap-2 text-[11px] rounded-lg px-3 py-2 transition-all",
                step.dir === "out" ? "bg-indigo-50 border border-indigo-100" : "bg-gray-50 border border-gray-100",
                isAccepted && "bg-green-50 border-green-200",
              )}>
                <span className="text-[10px] text-gray-400">{step.dir === "out" ? "→" : "←"}</span>
                <span className={cn(
                  "font-medium flex-1",
                  isAccepted ? "text-green-700" : isRejected ? "text-red-600" : "text-gray-700"
                )}>
                  {step.label}: ${step.rate.toLocaleString()}
                </span>
                {isAccepted && <CheckCircle2 size={11} className="text-green-600" />}
                {isRejected && <X size={11} className="text-red-400" />}
                {step.status === "sent" && <ArrowRight size={11} className="text-indigo-400" />}
              </div>
            )
          })}
        </div>
      )}

      {phase >= 5 && (
        <div className="mt-3 pt-2 border-t border-green-200 flex items-center gap-2 justify-center">
          <Shield size={12} className="text-green-600" />
          <span className="text-[11px] font-bold text-green-700">Rate Locked — Within 10% approval threshold</span>
        </div>
      )}
    </div>
  )
}

// 5. Missing Booking Fields — form with auto-fill animation
function MissingFieldsVisual({ onComplete }: { onComplete: () => void }) {
  const [fillingIdx, setFillingIdx] = useState(-1) // -1=all red, 0-2=filling, 3=all done
  const [typedValues, setTypedValues] = useState(["", "", ""])
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const fields = [
    { label: "Cargo Weight (kg)", value: "18,500", source: "SAP WM — matched by PO ref", query: "Querying SAP WM..." },
    { label: "HS Commodity Code", value: "8471.30", source: "Historical Data — 94% confidence", query: "Querying historical records..." },
    { label: "Cargo Ready Date", value: "Mar 16, 2025", source: "Production Schedule — Plant RTM", query: "Cross-referencing schedule..." },
  ]

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    // Field 0
    timers.push(setTimeout(() => setFillingIdx(0), 1000))
    timers.push(setTimeout(() => setTypedValues(["18,500", "", ""]), 2000))

    // Field 1
    timers.push(setTimeout(() => setFillingIdx(1), 2500))
    timers.push(setTimeout(() => setTypedValues(["18,500", "8471.30", ""]), 3500))

    // Field 2
    timers.push(setTimeout(() => setFillingIdx(2), 4000))
    timers.push(setTimeout(() => setTypedValues(["18,500", "8471.30", "Mar 16, 2025"]), 5000))

    // All done
    timers.push(setTimeout(() => setFillingIdx(3), 5500))
    timers.push(setTimeout(() => onCompleteRef.current(), 7000))

    return () => timers.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="rounded-xl border border-indigo-200 bg-white px-5 py-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain size={14} className="text-indigo-600 animate-pulse" />
        <span className="text-xs font-bold text-indigo-800">AI Agent — Auto-Fill Missing Fields</span>
      </div>

      <div className="space-y-3">
        {fields.map((field, i) => {
          const isFilling = fillingIdx === i && !typedValues[i]
          const isFilled = !!typedValues[i]
          const isRed = !isFilling && !isFilled

          return (
            <div key={field.label} className={cn(
              "rounded-lg border px-4 py-3 transition-all duration-500",
              isFilled ? "border-green-200 bg-green-50/50" :
              isFilling ? "border-indigo-200 bg-indigo-50/40" :
              "border-red-200 bg-red-50/40"
            )}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-gray-700">{field.label}</span>
                {isRed && (
                  <span className="text-[8px] font-bold text-red-600 bg-red-100 rounded px-1.5 py-0.5">REQUIRED</span>
                )}
                {isFilling && (
                  <span className="text-[8px] font-bold text-indigo-600 bg-indigo-100 rounded px-1.5 py-0.5 flex items-center gap-1">
                    <Brain size={8} className="animate-pulse" /> SEARCHING
                  </span>
                )}
                {isFilled && (
                  <span className="text-[8px] font-bold text-green-600 bg-green-100 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                    <CheckCircle2 size={8} /> FILLED
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex-1 rounded border px-3 py-1.5 text-[12px] font-mono min-h-[28px] flex items-center transition-all",
                  isFilled ? "border-green-300 bg-white text-green-800 font-bold" :
                  isFilling ? "border-indigo-300 bg-white" :
                  "border-red-200 bg-red-50"
                )}>
                  {isFilling && !typedValues[i] && (
                    <span className="text-indigo-500 text-[10px] flex items-center gap-1">
                      <Loader2 size={9} className="animate-spin" /> {field.query}
                    </span>
                  )}
                  {typedValues[i] && <span>{typedValues[i]}</span>}
                  {isRed && <span className="text-red-300 text-[10px]">— empty —</span>}
                </div>
                {isFilled && (
                  <span className="text-[9px] text-green-600 bg-green-100/80 rounded px-2 py-1 whitespace-nowrap shrink-0">
                    {field.source}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {fillingIdx >= 3 && (
        <div className="mt-3 pt-2 border-t border-green-200 flex items-center gap-2 justify-center">
          <CheckCircle2 size={12} className="text-green-600" />
          <span className="text-[11px] font-bold text-green-700">Validation Passed — All mandatory fields schema-validated</span>
        </div>
      )}
    </div>
  )
}

// ── Resolution Modal ────────────────────────────────────────────────────────

function ResolutionModal({
  booking,
  phase,
  resolvedStepIdx,
  onClose,
  onStartResolve,
  onProceedToHappyPath,
  onVisualComplete,
}: {
  booking: BookingRequest
  phase: ResolutionPhase
  resolvedStepIdx: number
  onClose: () => void
  onStartResolve: () => void
  onProceedToHappyPath: () => void
  onVisualComplete: () => void
}) {
  const exType = booking.exceptionType as string
  const resolution = EXCEPTION_RESOLUTIONS[exType] || EXCEPTION_RESOLUTIONS["Missing Allocation"]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={phase === "modal-open" ? onClose : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-[620px] max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              phase === "resolved" || phase === "animating" || phase === "done"
                ? "bg-green-100 border border-green-200"
                : "bg-red-100 border border-red-200"
            )}>
              {phase === "resolved" || phase === "animating" || phase === "done"
                ? <CheckCircle2 size={14} className="text-green-600" />
                : <AlertTriangle size={14} className="text-red-600" />
              }
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">Exception Resolution — {booking.id}</h3>
              <p className="text-[11px] text-gray-400">{booking.lane} · {booking.mode} · {exType}</p>
            </div>
          </div>
          {phase === "modal-open" && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* AI Diagnosis card */}
          <div className={cn(
            "rounded-xl border px-5 py-4 mb-4",
            phase === "modal-open" ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50/50"
          )}>
            <div className="flex items-center gap-2 mb-3">
              <Brain size={13} className={phase === "modal-open" ? "text-red-600" : "text-gray-400"} />
              <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">AI Diagnosis</span>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex gap-2">
                <span className="text-gray-400 font-semibold w-20 shrink-0">Exception</span>
                <span className="text-gray-700 font-medium">{exType}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 font-semibold w-20 shrink-0">Diagnosis</span>
                <span className="text-gray-700">{resolution.diagnosis}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 font-semibold w-20 shrink-0">Root cause</span>
                <span className="text-gray-600">{resolution.rootCause}</span>
              </div>
            </div>
          </div>

          {/* Resolving — unique visual per exception type */}
          {phase === "resolving" && (() => {
            switch (exType) {
              case "Missing Allocation":
                return <MissingAllocationVisual onComplete={onVisualComplete} />
              case "Carrier Rejection":
                return <CarrierRejectionVisual onComplete={onVisualComplete} />
              case "Portal Unavailable":
                return <PortalUnavailableVisual variant="portal" onComplete={onVisualComplete} />
              case "Credentials Expired":
                return <PortalUnavailableVisual variant="credentials" onComplete={onVisualComplete} />
              case "Rate Mismatch":
                return <RateMismatchVisual onComplete={onVisualComplete} />
              case "Missing Booking Fields":
                return <MissingFieldsVisual onComplete={onVisualComplete} />
              default:
                return <MissingAllocationVisual onComplete={onVisualComplete} />
            }
          })()}

          {/* Resolved — AI action + new carrier */}
          {(phase === "resolved" || phase === "animating" || phase === "done") && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={14} className="text-green-600" />
                <span className="text-xs font-bold text-green-800">Exception Resolved</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                {resolution.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={10} className="text-green-500 shrink-0 mt-0.5" />
                    <span className="text-green-700"><span className="font-semibold">{step.label}:</span> {step.detail}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-green-200 grid grid-cols-3 gap-4 text-[11px]">
                <div>
                  <span className="text-green-600 text-[10px]">Carrier</span>
                  <div className="font-bold text-green-800">{resolution.resolvedCarrier}</div>
                </div>
                <div>
                  <span className="text-green-600 text-[10px]">Rate</span>
                  <div className="font-bold text-green-800">${resolution.resolvedRate.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-green-600 text-[10px]">Transit</span>
                  <div className="font-bold text-green-800">{resolution.resolvedTransit}d</div>
                </div>
              </div>
            </div>
          )}

          {/* Hint: pipeline animation will play after modal closes */}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          {phase === "modal-open" && (
            <>
              <button
                onClick={onClose}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 bg-white rounded-lg px-4 py-2.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onStartResolve}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-5 py-2.5 transition-colors shadow-sm"
              >
                <Wrench size={13} /> Apply AI Fix <ArrowRight size={13} />
              </button>
            </>
          )}
          {phase === "resolving" && (
            <div className="w-full text-center text-[11px] text-indigo-500 font-medium flex items-center justify-center gap-1">
              Resolving exception <ThinkingDots />
            </div>
          )}
          {phase === "resolved" && (
            <>
              <div className="text-[11px] text-green-600 font-medium flex items-center gap-1">
                <CheckCircle2 size={11} /> Fix applied successfully
              </div>
              <button
                onClick={onProceedToHappyPath}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-5 py-2.5 transition-colors shadow-sm"
              >
                <CheckCircle2 size={13} /> Approve Action <ArrowRight size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Simulation Narration Content ─────────────────────────────────────────────

interface NarrationStep {
  step: number
  title: string
  input: string[]
  output: string[]
}

const NARRATION_MAP: Partial<Record<SimulationPhase, NarrationStep>> = {
  "pipeline-ingested": {
    step: 1,
    title: "SAP Requirement Ingested",
    input: [
      "SAP Order: SAP-TM-44862",
      "Route: Ningbo, CN → Hamburg, DE",
      "Ocean · 40' HC · 18,200 kg · Electronic Components",
      "Priority: High — Production Critical",
    ],
    output: [
      "All 8 mandatory booking fields validated",
      "Route NGB→HAM identified — 4 active carriers",
      "Target ship date: Mar 21, 2025",
    ],
  },
  "pipeline-carrier": {
    step: 2,
    title: "Carrier Selected",
    input: [
      "Evaluated: Maersk, Hapag-Lloyd, MSC, CMA-CGM",
      "Criteria: Rate ≤$3,000 · Transit ≤14d · SLA ≥90%",
      "Lane: NGB→HAM · Mode: FCL Ocean",
    ],
    output: [
      "Winner: Maersk — $2,850/40'HC (contract rate)",
      "Transit: 14 days · SLA: 92% · Capacity: Available",
      "Score: 94.2/100 (rate 32 + SLA 28 + transit 22 + capacity 12)",
    ],
  },
  "pipeline-portal": {
    step: 3,
    title: "Portal Login",
    input: [
      "Target: Maersk Booking Portal (API Gateway)",
      "Credentials: Vault → MAERSK-PROD-API-KEY",
      "Auth: OAuth 2.0 · Client ID: ztb-agent-prod",
    ],
    output: [
      "Session #MK-881204 established",
      "Booking form pre-populated with shipment data",
      "2FA completed via API token (no manual entry)",
    ],
  },
  "pipeline-submitted": {
    step: 4,
    title: "Booking Submitted",
    input: [
      "Booking: NGB→HAM · 40' HC · Maersk Sealand",
      "Ship date: Mar 21 · PO Ref: SAP-TM-44862",
      "Payload: 14 fields submitted to Maersk API",
    ],
    output: [
      "Booking Ref: MAEU2462110 assigned",
      "Carrier status: Accepted · ETA: Apr 4, 2025",
      "Vessel confirmed: Maersk Sealand — Sailing Mar 21",
    ],
  },
  "pipeline-docs": {
    step: 5,
    title: "Documents Uploaded",
    input: [
      "Commercial Invoice — CI-44862.pdf (auto-generated)",
      "Packing List — PL-44862.pdf (from SAP WM)",
      "Shipper's Letter of Instruction — SLI-44862.pdf",
    ],
    output: [
      "3/3 documents accepted by Maersk portal",
      "Compliance check: PASSED (no hazmat flags)",
      "HS Code validated: 8542.31 — Integrated Circuits",
    ],
  },
  "pipeline-confirmed": {
    step: 6,
    title: "Booking Confirmed",
    input: [
      "Carrier confirmation signal received",
      "Vessel: Maersk Sealand · Sailing: Mar 21, 2025",
      "Booking Ref: MAEU2462110",
    ],
    output: [
      "SAP TM status synced → 'Booking Confirmed'",
      "OTM shipment created → OTM-NGB-44862",
      "Stakeholder notification queued (3 recipients)",
      "Total time: 47 seconds · Human interventions: 0",
    ],
  },
}

// Order of pipeline phases for showing completed history
const PIPELINE_PHASE_ORDER: SimulationPhase[] = [
  "pipeline-ingested",
  "pipeline-carrier",
  "pipeline-portal",
  "pipeline-submitted",
  "pipeline-docs",
  "pipeline-confirmed",
]

function SimulationNarration({ simPhase }: { simPhase: SimulationPhase }) {
  // Show narration for all pipeline phases + "complete" (keeps final state visible)
  const currentIdx = simPhase === "complete"
    ? PIPELINE_PHASE_ORDER.length - 1
    : PIPELINE_PHASE_ORDER.indexOf(simPhase)
  if (currentIdx === -1) return null

  const isComplete = simPhase === "pipeline-confirmed" || simPhase === "complete"

  // Show completed steps + current step
  const visiblePhases = PIPELINE_PHASE_ORDER.slice(0, currentIdx + 1)

  return (
    <div className={cn(
      "bg-white rounded-xl border px-5 py-4 transition-all",
      isComplete ? "border-green-200" : "border-indigo-200"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            isComplete ? "bg-green-50 border border-green-200" : "bg-indigo-50 border border-indigo-200"
          )}>
            {isComplete
              ? <CheckCircle2 size={14} className="text-green-600" />
              : <Brain size={14} className="text-indigo-600 animate-pulse" />
            }
          </div>
          <div>
            <span className={cn("text-xs font-bold", isComplete ? "text-green-800" : "text-indigo-800")}>
              {isComplete ? "Zero-Touch Booking Complete" : "AI Agent Working"}
            </span>
            <div className="text-[10px] text-gray-400 mt-0.5">BKG-SIM-01 · NGB→HAM · Maersk</div>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-gray-400">
          Step {currentIdx + 1}/6
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-500",
              i <= currentIdx
                ? isComplete ? "bg-green-500" : "bg-indigo-500"
                : "bg-gray-200"
            )}
          />
        ))}
      </div>

      {/* Step history with INPUT/OUTPUT */}
      <div className="space-y-3">
        {visiblePhases.map((phase, phaseIdx) => {
          const narration = NARRATION_MAP[phase]!
          const isCurrent = phaseIdx === visiblePhases.length - 1
          const isLast = phase === "pipeline-confirmed"

          return (
            <div
              key={phase}
              className={cn(
                "rounded-lg border px-4 py-3 transition-all",
                isCurrent && !isLast
                  ? "border-indigo-200 bg-indigo-50/40"
                  : isLast
                  ? "border-green-200 bg-green-50/40"
                  : "border-gray-100 bg-gray-50/30"
              )}
            >
              {/* Step title */}
              <div className="flex items-center gap-2 mb-2">
                {isCurrent && !isLast ? (
                  <div className="w-5 h-5 rounded-full bg-indigo-100 border border-indigo-300 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-indigo-600">{narration.step}</span>
                  </div>
                ) : (
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center",
                    isLast ? "bg-green-100 border border-green-300" : "bg-green-100 border border-green-300"
                  )}>
                    <CheckCircle2 size={10} className="text-green-600" />
                  </div>
                )}
                <span className={cn(
                  "text-[11px] font-bold",
                  isCurrent && !isLast ? "text-indigo-800" : isLast ? "text-green-800" : "text-gray-600"
                )}>
                  {narration.title}
                </span>
                {isCurrent && !isLast && (
                  <span className="ml-auto inline-flex items-end gap-[3px]">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
                        style={{ animationDelay: `${d}ms`, animationDuration: "900ms" }}
                      />
                    ))}
                  </span>
                )}
              </div>

              {/* INPUT / OUTPUT grid */}
              <div className="grid grid-cols-2 gap-3 pl-7">
                {/* INPUT */}
                <div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Input</div>
                  <div className="space-y-0.5">
                    {narration.input.map((line, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px] text-gray-600">
                        <ArrowRight size={8} className="text-gray-300 shrink-0 mt-0.5" />
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* OUTPUT */}
                <div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Output</div>
                  <div className="space-y-0.5">
                    {narration.output.map((line, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px]">
                        <CheckCircle2 size={8} className={cn(
                          "shrink-0 mt-0.5",
                          isCurrent && !isLast ? "text-indigo-400" : "text-green-500"
                        )} />
                        <span className={cn(
                          isCurrent && !isLast ? "text-indigo-700" : isLast ? "text-green-700" : "text-green-700"
                        )}>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Resolution Pipeline Progress ─────────────────────────────────────────────

function ResolutionPipelineProgress({ bookingId, stepIdx }: { bookingId: string; stepIdx: number }) {
  const booking = BOOKING_REQUESTS.find((b) => b.id === bookingId)
  const exType = booking?.exceptionType as string || "Missing Allocation"
  const resolution = EXCEPTION_RESOLUTIONS[exType] || EXCEPTION_RESOLUTIONS["Missing Allocation"]
  const isDone = stepIdx >= HAPPY_PATH_STATUSES.length - 1

  const STEP_LABELS = ["Carrier Selected", "Portal Login", "Submitted", "Docs Uploaded", "Confirmed"]

  return (
    <div className={cn(
      "bg-white rounded-xl border px-5 py-4 transition-all",
      isDone ? "border-green-300 shadow-sm shadow-green-100" : "border-indigo-200 shadow-sm shadow-indigo-50"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            isDone ? "bg-green-50 border border-green-200" : "bg-indigo-50 border border-indigo-200"
          )}>
            {isDone
              ? <CheckCircle2 size={14} className="text-green-600" />
              : <RotateCcw size={14} className="text-indigo-600 animate-spin" style={{ animationDuration: "2s" }} />
            }
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-bold", isDone ? "text-green-800" : "text-indigo-800")}>
                {isDone ? "Action Approved — Resuming Pipeline" : "Executing Approved Action"}
              </span>
              {!isDone && <ThinkingDots />}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {bookingId} · {booking?.lane || "—"} · {resolution.resolvedCarrier} · ${resolution.resolvedRate.toLocaleString()}
            </div>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-gray-400">
          Step {Math.min(stepIdx + 1, 5)}/5
        </span>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-1">
        {STEP_LABELS.map((label, i) => {
          const isStepDone = i <= stepIdx
          const isActive = i === stepIdx && !isDone
          return (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn(
                "h-2 w-full rounded-full transition-all duration-700",
                isStepDone
                  ? isDone ? "bg-green-500" : "bg-indigo-500"
                  : "bg-gray-200",
                isActive && "animate-pulse"
              )} />
              <span className={cn(
                "text-[9px] font-medium transition-colors",
                isStepDone
                  ? isDone ? "text-green-600 font-semibold" : "text-indigo-600 font-semibold"
                  : "text-gray-400"
              )}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

interface BookingPipelineProps {
  onSendNotification?: (email: SentEmailItem) => void
  onViewChange?: (view: SidebarView) => void
  simPhase?: SimulationPhase
  onSimPhaseChange?: (phase: SimulationPhase) => void
}

export function BookingPipeline({ onSendNotification, onViewChange, simPhase, onSimPhaseChange }: BookingPipelineProps) {
  const [thinking, setThinking] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedExceptionId, setExpandedExceptionId] = useState<string | null>(null)
  const [simBookingStatus, setSimBookingStatus] = useState<BookingStatus>("Pending")

  // Exception resolution state
  const [resolvingBookingId, setResolvingBookingId] = useState<string | null>(null)
  const [resolutionPhase, setResolutionPhase] = useState<ResolutionPhase>("modal-open")
  const [resolvedStepIdx, setResolvedStepIdx] = useState(0)
  const [resolvedBookings, setResolvedBookings] = useState<Map<string, BookingStatus>>(new Map())
  // Tracks bookings animating through pipeline columns (after modal closes)
  const [pipelineAnimatingIds, setPipelineAnimatingIds] = useState<Set<string>>(new Set())
  // Current step index per animating booking (0-4 mapping to HAPPY_PATH_STATUSES)
  const [pipelineAnimStep, setPipelineAnimStep] = useState<Map<string, number>>(new Map())

  // Skip thinking animation when simulation is active (user is coming from email)
  const simActive = simPhase && simPhase !== "idle" && !simPhase.startsWith("email")

  useEffect(() => {
    if (simActive) {
      setThinking(false)
      return
    }
    const t = setTimeout(() => setThinking(false), 1500)
    return () => clearTimeout(t)
  }, [simActive])

  // Stable refs for simulation timer chain
  const simPhaseChangeRef = useRef(onSimPhaseChange)
  simPhaseChangeRef.current = onSimPhaseChange
  const simPhaseRef = useRef(simPhase)
  simPhaseRef.current = simPhase
  const simStartedRef = useRef(false)

  // Timer chain for simulation pipeline progression — fires once when pipeline-ingested
  useEffect(() => {
    if (simStartedRef.current) return
    if (simPhaseRef.current !== "pipeline-ingested") return
    simStartedRef.current = true
    const steps: Array<{ delay: number; status: BookingStatus; phase: SimulationPhase }> = [
      { delay: 3000, status: "Carrier Selected", phase: "pipeline-carrier" },
      { delay: 6000, status: "Portal Login", phase: "pipeline-portal" },
      { delay: 9000, status: "Booking Submitted", phase: "pipeline-submitted" },
      { delay: 12000, status: "Docs Uploaded", phase: "pipeline-docs" },
      { delay: 15000, status: "Confirmed", phase: "pipeline-confirmed" },
    ]
    steps.forEach(({ delay, status, phase }) =>
      setTimeout(() => {
        setSimBookingStatus(status)
        simPhaseChangeRef.current?.(phase)
      }, delay)
    )
  })

  // ── Exception Resolution Handlers ──────────────────────────────────────────

  const handleOpenResolve = useCallback((bookingId: string) => {
    setResolvingBookingId(bookingId)
    setResolutionPhase("modal-open")
    setResolvedStepIdx(0)
  }, [])

  const handleCloseResolve = useCallback(() => {
    setResolvingBookingId(null)
    setResolutionPhase("modal-open")
    setResolvedStepIdx(0)
  }, [])

  const handleStartResolve = useCallback(() => {
    setResolutionPhase("resolving")
    setResolvedStepIdx(0)
    // Sub-component will call handleVisualComplete when animation finishes
  }, [])

  const handleVisualComplete = useCallback(() => {
    setResolutionPhase("resolved")
  }, [])

  const handleProceedToHappyPath = useCallback(() => {
    if (!resolvingBookingId) return
    const bookingId = resolvingBookingId

    // Close modal immediately — animation plays in the pipeline itself
    setResolvingBookingId(null)
    setResolutionPhase("modal-open")
    setResolvedStepIdx(0)

    // Mark booking as animating in pipeline
    setPipelineAnimatingIds((prev) => new Set([...prev, bookingId]))
    setPipelineAnimStep((prev) => new Map(prev).set(bookingId, 0))

    // Move through happy path statuses — card travels across pipeline columns
    const statuses = HAPPY_PATH_STATUSES
    const STEP_DELAY = 2000 // 2s per column for visibility
    statuses.forEach((status, i) => {
      setTimeout(() => {
        setResolvedBookings((prev) => new Map(prev).set(bookingId, status))
        setPipelineAnimStep((prev) => new Map(prev).set(bookingId, i))
        if (i === statuses.length - 1) {
          // Animation done — remove from animating set after a brief pause
          setTimeout(() => {
            setPipelineAnimatingIds((prev) => {
              const next = new Set(prev)
              next.delete(bookingId)
              return next
            })
            setPipelineAnimStep((prev) => {
              const next = new Map(prev)
              next.delete(bookingId)
              return next
            })
          }, 1500)
        }
      }, (i + 1) * STEP_DELAY)
    })
  }, [resolvingBookingId])

  // Inject simulation booking + apply resolved booking overrides
  const bookings = useMemo(() => {
    let list = [...BOOKING_REQUESTS]
    if (simActive) {
      const simBooking = { ...SIMULATION_BOOKING, bookingStatus: simBookingStatus }
      list = [simBooking, ...list]
    }
    // Override resolved bookings' status
    if (resolvedBookings.size > 0) {
      list = list.map((b) => {
        const overrideStatus = resolvedBookings.get(b.id)
        if (overrideStatus) return { ...b, bookingStatus: overrideStatus }
        return b
      })
    }
    return list
  }, [simActive, simBookingStatus, resolvedBookings])

  // Group bookings by pipeline column
  const columnData = PIPELINE_COLUMNS.map((col) => ({
    ...col,
    bookings: bookings.filter((b) => col.statuses.includes(b.bookingStatus)),
  }))

  // KPIs
  const total = bookings.length
  const inPipeline = bookings.filter((b) =>
    !["Confirmed", "Notified"].includes(b.bookingStatus)
  ).length
  const completed = bookings.filter((b) =>
    ["Confirmed", "Notified"].includes(b.bookingStatus)
  ).length
  const exceptions = bookings.filter((b) =>
    b.bookingStatus === "Exception" || b.bookingStatus === "Awaiting Approval"
  ).length

  const selectedBooking = selectedId ? bookings.find((b) => b.id === selectedId) ?? null : null
  const resolvingBooking = resolvingBookingId ? BOOKING_REQUESTS.find((b) => b.id === resolvingBookingId) ?? null : null

  // Separate columns by type
  const flowColumns = columnData.filter((c) => c.group === "flow")
  const hasAnimating = pipelineAnimatingIds.size > 0
  // When animating, show ALL flow columns; otherwise split into data/empty
  const flowWithData = hasAnimating ? flowColumns : flowColumns.filter((c) => c.bookings.length > 0)
  const flowEmpty = hasAnimating ? [] : flowColumns.filter((c) => c.bookings.length === 0)
  const exceptionColumns = columnData.filter((c) => c.group === "exception")

  // Set of booking IDs that are currently animating through pipeline
  const animatingIds = pipelineAnimatingIds
  // Set of booking IDs that are fully resolved (done)
  const resolvedIds = new Set<string>()
  for (const [id, status] of resolvedBookings) {
    if (status === "Confirmed") resolvedIds.add(id)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-6 max-w-[1600px] mx-auto space-y-5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <Columns3 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Booking Pipeline</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Real-time view of {total} bookings across the autonomous booking workflow
            </p>
          </div>
        </div>

        {/* ── KPI Strip ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: total, icon: <Columns3 size={14} />, color: "border-l-indigo-500", textColor: "text-indigo-600" },
            { label: "In Pipeline", value: inPipeline, icon: <Loader2 size={14} className="animate-spin" />, color: "border-l-blue-500", textColor: "text-blue-600" },
            { label: "Completed", value: completed, icon: <CheckCircle2 size={14} />, color: "border-l-green-500", textColor: "text-green-600" },
            { label: "Exceptions", value: exceptions, icon: <AlertTriangle size={14} />, color: "border-l-red-500", textColor: "text-red-600" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={cn("bg-white rounded-lg border border-gray-200 border-l-[3px] px-4 py-3", kpi.color)}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                <span className={kpi.textColor}>{kpi.icon}</span>
                {kpi.label}
              </div>
              <div className={cn("text-2xl font-bold", kpi.textColor)}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* ── Resolution Progress Bar (shown during pipeline animation) ── */}
        {Array.from(pipelineAnimatingIds).map((id) => (
          <ResolutionPipelineProgress
            key={id}
            bookingId={id}
            stepIdx={pipelineAnimStep.get(id) ?? 0}
          />
        ))}

        {/* ── Kanban Board ───────────────────────────────────────────────── */}
        {thinking ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2 text-indigo-600">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm font-medium">Mapping booking pipeline</span>
              <ThinkingDots />
            </div>
            <p className="text-xs text-gray-400">Analyzing {total} active bookings across workflow stages</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            {/* Pipeline progress summary bar */}
            <div className="flex items-center gap-1 mb-4 px-1">
              {WORKFLOW_STEPS.map((step, i) => {
                const col = flowColumns[i]
                const count = col?.bookings.length ?? 0
                return (
                  <div key={step} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight size={10} className="text-gray-300 shrink-0" />}
                    <div className="flex items-center gap-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full", col?.color ?? "bg-gray-300")} />
                      <span className={cn(
                        "text-[10px] font-medium",
                        count > 0 ? "text-gray-600" : "text-gray-300"
                      )}>
                        {step}
                      </span>
                      {count > 0 && (
                        <span className="text-[9px] font-bold text-gray-800 bg-gray-100 rounded-full px-1 min-w-[14px] text-center">
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {/* ── Flow Columns ── */}
              {flowWithData.map((col) => {
                const isConfirmed = col.id === "confirmed"
                const isEmpty = col.bookings.length === 0
                // During animation, show empty columns as narrow placeholders
                if (isEmpty && hasAnimating) {
                  return (
                    <div key={col.id} className="w-[120px] flex-shrink-0 transition-all duration-500">
                      <div className={cn("rounded-t-lg px-2 py-2 flex items-center justify-between", col.bgColor)}>
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-2 h-2 rounded-full", col.color)} />
                          <span className="text-[10px] font-semibold text-gray-500">{col.label}</span>
                        </div>
                        <span className="text-[9px] font-bold rounded-full px-1 py-0.5 min-w-[14px] text-center bg-gray-200 text-gray-500">0</span>
                      </div>
                      <div className={cn("rounded-b-lg border border-gray-100 border-t-0 min-h-[120px] p-2 flex items-center justify-center", col.bgColor)}>
                        <span className="text-[9px] text-gray-300">—</span>
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={col.id} className={cn(
                    "flex-shrink-0 transition-all duration-500",
                    isConfirmed ? "min-w-[190px] w-[200px]" : "min-w-[200px] w-[220px]"
                  )}>
                    <div className={cn("rounded-t-lg px-3 py-2 flex items-center justify-between", col.bgColor)}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", col.color)} />
                        <span className="text-[11px] font-semibold text-gray-700">{col.label}</span>
                      </div>
                      <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center bg-gray-800 text-white">
                        {col.bookings.length}
                      </span>
                    </div>
                    <div className={cn("rounded-b-lg border border-gray-100 border-t-0 min-h-[120px] p-2 space-y-2", col.bgColor)}>
                      {col.bookings.map((booking) =>
                        isConfirmed ? (
                          <ConfirmedCard
                            key={booking.id}
                            booking={booking}
                            onClick={() => setSelectedId(booking.id)}
                            isSimulation={booking.id === "BKG-SIM-01"}
                            isResolved={resolvedIds.has(booking.id)}
                          />
                        ) : (
                          <StandardCard
                            key={booking.id}
                            booking={booking}
                            col={col}
                            onClick={() => setSelectedId(booking.id)}
                            isSimulation={booking.id === "BKG-SIM-01"}
                            isResolving={animatingIds.has(booking.id)}
                          />
                        )
                      )}
                    </div>
                  </div>
                )
              })}

              {/* ── Separator: flow → exception ── */}
              <div className="flex flex-col items-center justify-center px-1 flex-shrink-0">
                <div className="w-px h-full bg-gradient-to-b from-transparent via-red-300 to-transparent min-h-[120px]" />
              </div>

              {/* ── Exception Columns (compact by default) ── */}
              {exceptionColumns.map((col) => (
                <div key={col.id} className="min-w-[200px] w-[220px] flex-shrink-0">
                  <div className={cn(
                    "rounded-t-lg px-3 py-2 flex items-center justify-between",
                    col.id === "exception" ? "bg-red-50" : "bg-amber-50"
                  )}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={11} className={col.id === "exception" ? "text-red-500" : "text-amber-500"} />
                      <span className={cn(
                        "text-[11px] font-bold",
                        col.id === "exception" ? "text-red-700" : "text-amber-700"
                      )}>
                        {col.label}
                      </span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center text-white",
                      col.id === "exception" ? "bg-red-500" : "bg-amber-500"
                    )}>
                      {col.bookings.length}
                    </span>
                  </div>
                  <div className={cn(
                    "rounded-b-lg border border-t-0 min-h-[120px] p-2 space-y-2",
                    col.id === "exception" ? "bg-red-50/30 border-red-100" : "bg-amber-50/30 border-amber-100"
                  )}>
                    {col.bookings.length === 0 && (
                      <div className="text-[10px] text-gray-400 text-center py-6">No exceptions</div>
                    )}
                    {col.bookings.map((booking) => (
                      <ExceptionCardCompact
                        key={booking.id}
                        booking={booking}
                        col={col}
                        isExpanded={expandedExceptionId === booking.id}
                        onExpand={() => setExpandedExceptionId(expandedExceptionId === booking.id ? null : booking.id)}
                        onOpenDrawer={() => setSelectedId(booking.id)}
                        onViewChange={onViewChange}
                        onResolve={() => handleOpenResolve(booking.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* ── Empty Flow Columns (at the end) ── */}
              {flowEmpty.length > 0 && (
                <>
                  <div className="flex flex-col items-center justify-center px-1 flex-shrink-0">
                    <div className="w-px h-full bg-gradient-to-b from-transparent via-gray-200 to-transparent min-h-[120px]" />
                  </div>
                  {flowEmpty.map((col) => (
                    <CollapsedColumn key={col.id} col={col} />
                  ))}
                </>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 px-1">
              <span className="text-[10px] text-gray-400 font-medium">Legend:</span>
              <div className="flex items-center gap-1.5">
                <ProgressDots completed={3} total={6} />
                <span className="text-[10px] text-gray-500">Step progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1.5 rounded-sm bg-amber-400" />
                <span className="text-[10px] text-gray-500">Slow (&gt;2h)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1.5 rounded-sm bg-red-500" />
                <span className="text-[10px] text-gray-500">Bottleneck (&gt;4h)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Minus size={9} className="text-red-300" />
                <span className="text-[10px] text-gray-500">Exception boundary</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Simulation Narration ─────────────────────────────────────── */}
        {simActive && simPhase && (NARRATION_MAP[simPhase] || simPhase === "complete") && (
          <SimulationNarration simPhase={simPhase} />
        )}
      </div>

      {/* ── Shipment Drawer ─────────────────────────────────────────────── */}
      <ShipmentDrawer
        shipment={selectedBooking}
        onClose={() => setSelectedId(null)}
        onSendNotification={onSendNotification}
      />

      {/* ── Resolution Modal ─────────────────────────────────────────────── */}
      {resolvingBooking && (
        <ResolutionModal
          booking={resolvingBooking}
          phase={resolutionPhase}
          resolvedStepIdx={resolvedStepIdx}
          onClose={handleCloseResolve}
          onStartResolve={handleStartResolve}
          onProceedToHappyPath={handleProceedToHappyPath}
          onVisualComplete={handleVisualComplete}
        />
      )}
    </div>
  )
}
