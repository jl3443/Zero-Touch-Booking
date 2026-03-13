"use client"

import { useState } from "react"
import {
  SHIPMENTS,
  REROUTE_OPTIONS,
  DD_RISKS,
  CARRIER_POLICIES,
  type Severity,
  type ExceptionType,
  type TransportMode,
  type Shipment,
  type RerouteOption,
  type ApprovalType,
  type DDRisk,
  type MissingField,
} from "@/lib/mock-data"
import { SeverityBadge, ModeBadge, ExceptionBadge, CarrierBadge, ReasonChips, SourceBadge } from "./shared"
import { cn } from "@/lib/utils"
import {
  CheckCircle, Send, GitBranch, RefreshCw, AlertOctagon, ArrowUpDown, Filter, X,
  PhoneCall, TrendingUp, ChevronRight, Zap, Brain, Search, Loader2,
  ShieldAlert, DollarSign, FileWarning, Ban, KeyRound, Package, Globe, Calendar,
  ThumbsUp, ThumbsDown, ArrowRightLeft, BarChart3, ClipboardList, Gauge,
} from "lucide-react"
import type { SentEmailItem } from "./email-sent-page"
import { ShipmentDrawer } from "./shipment-drawer"

// ── Types ──────────────────────────────────────────────────────────────

type SortBy = "severity" | "lane" | "date"

const SEVERITY_ORDER: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }

interface WorkbenchCardActions {
  acknowledged: boolean
  notified: boolean
  actionTaken: string | null  // which primary action button was clicked
  escalated: boolean
  rerouteApproved: string | null
}

type AllActions = Record<string, WorkbenchCardActions>

const DEFAULT_ACTIONS: WorkbenchCardActions = {
  acknowledged: false,
  notified: false,
  actionTaken: null,
  escalated: false,
  rerouteApproved: null,
}

// ── Approval state ──────────────────────────────────────────────────────

interface ApprovalState {
  approved: boolean
  overridden: boolean
  decision: string | null
}

type AllApprovals = Record<string, ApprovalState>

const DEFAULT_APPROVAL: ApprovalState = {
  approved: false,
  overridden: false,
  decision: null,
}

// ── Recipient lookups ───────────────────────────────────────────────────

const NOTIFY_RECIPIENTS: Record<string, { name: string; email: string }> = {
  "BKG-10421": { name: "LAX Distribution Center", email: "lax-dist@company.com" },
  "BKG-20334": { name: "ORD Warehouse Hub", email: "ord-hub@company.com" },
  "BKG-30188": { name: "RTM Euro Hub", email: "rtm-euro@company.com" },
  "BKG-40672": { name: "DTW Assembly Plant", email: "dtw-plant@company.com" },
  "BKG-50219": { name: "IAH Petrochem Hub", email: "iah-petro@company.com" },
  "BKG-60441": { name: "ORD Midwest DC", email: "ord-midwest@company.com" },
  "BKG-70991": { name: "LAX Cold Chain DC", email: "lax-cold@company.com" },
  "BKG-88442": { name: "RTM Euro Hub", email: "rtm-euro@company.com" },
}

const CARRIER_OPS: Record<string, { name: string; email: string }> = {
  "BKG-30188": { name: "Capacity Desk", email: "capacity@spot-carriers.com" },
  "BKG-50219": { name: "Maersk Booking Desk", email: "bookings@maersk.com" },
  "BKG-70991": { name: "CMA-CGM Rate Desk", email: "rates@cma-cgm.com" },
  "BKG-40672": { name: "Hapag-Lloyd Ops", email: "ops@hapag-lloyd.com" },
  "BKG-60441": { name: "CMA-CGM eBusiness", email: "ebusiness@cma-cgm.com" },
  "BKG-88442": { name: "Hapag-Lloyd Ops", email: "ops@hapag-lloyd.com" },
}

const ESCALATION_RECIPIENTS: Record<string, { name: string; email: string }> = {
  "BKG-30188": { name: "VP Supply Chain", email: "vp-sc@company.com" },
  "BKG-50219": { name: "VP Operations", email: "vp-ops@company.com" },
  "BKG-70991": { name: "VP Operations", email: "vp-ops@company.com" },
  "BKG-40672": { name: "Director Logistics", email: "dir-logistics@company.com" },
  "BKG-60441": { name: "Director IT Operations", email: "dir-it@company.com" },
  "BKG-88442": { name: "VP Supply Chain", email: "vp-sc@company.com" },
}

// ── Exception descriptions ──────────────────────────────────────────────

const EXCEPTION_DESCRIPTIONS: Record<ExceptionType, string> = {
  "Missing Allocation": "No capacity available on lane",
  "Portal Unavailable": "Portal/API down — booking access blocked",
  "Rate Mismatch": "Quoted rate differs from contract/system rate",
  "Missing Booking Fields": "Incomplete shipment data in SAP/OTM",
  "Carrier Rejection": "Carrier rejects booking — re-routing required",
  "Credentials Expired": "Credentials expired — portal/API access blocked",
  "None": "No exception",
}

// ── Exception icons ─────────────────────────────────────────────────────

function ExceptionIcon({ type, size = 14 }: { type: ExceptionType; size?: number }) {
  const map: Record<ExceptionType, { Icon: typeof Package; color: string }> = {
    "Missing Allocation": { Icon: Package, color: "text-amber-600" },
    "Portal Unavailable": { Icon: Ban, color: "text-purple-600" },
    "Rate Mismatch": { Icon: DollarSign, color: "text-red-600" },
    "Missing Booking Fields": { Icon: FileWarning, color: "text-indigo-600" },
    "Carrier Rejection": { Icon: ShieldAlert, color: "text-red-700" },
    "Credentials Expired": { Icon: KeyRound, color: "text-gray-600" },
    "None": { Icon: CheckCircle, color: "text-green-600" },
  }
  const { Icon, color } = map[type]
  return <Icon size={size} className={color} />
}

// ── Exception action configs ────────────────────────────────────────────

interface ExceptionAction {
  label: string
  icon: React.ReactNode
  variant: "primary" | "secondary" | "warning" | "danger" | "route" | "success"
  key: string
}

function getExceptionActions(type: ExceptionType): ExceptionAction[] {
  switch (type) {
    case "Missing Allocation":
      return [
        { label: "Check Spot Market", icon: <Search size={11} />, variant: "primary", key: "spot-market" },
        { label: "Request Allocation", icon: <PhoneCall size={11} />, variant: "warning", key: "request-alloc" },
        { label: "Alternate Carrier", icon: <ArrowRightLeft size={11} />, variant: "route", key: "alt-carrier" },
      ]
    case "Portal Unavailable":
      return [
        { label: "Retry Portal", icon: <RefreshCw size={11} />, variant: "primary", key: "retry-portal" },
        { label: "Switch to API", icon: <Zap size={11} />, variant: "secondary", key: "switch-api" },
        { label: "Manual Booking", icon: <FileWarning size={11} />, variant: "warning", key: "manual-book" },
      ]
    case "Rate Mismatch":
      return [
        { label: "Accept Quoted", icon: <DollarSign size={11} />, variant: "primary", key: "accept-rate" },
        { label: "Flag Negotiation", icon: <BarChart3 size={11} />, variant: "warning", key: "flag-negotiate" },
        { label: "Alternate Carrier", icon: <ArrowRightLeft size={11} />, variant: "route", key: "alt-carrier" },
      ]
    case "Missing Booking Fields":
      return [
        { label: "Pull from SAP", icon: <RefreshCw size={11} />, variant: "primary", key: "pull-sap" },
        { label: "Request from Planner", icon: <Send size={11} />, variant: "warning", key: "request-planner" },
        { label: "Agent Auto-fill", icon: <Brain size={11} />, variant: "route", key: "auto-fill" },
      ]
    case "Carrier Rejection":
      return [
        { label: "Re-route", icon: <GitBranch size={11} />, variant: "primary", key: "reroute" },
        { label: "Negotiate", icon: <PhoneCall size={11} />, variant: "warning", key: "negotiate" },
        { label: "Escalate", icon: <AlertOctagon size={11} />, variant: "danger", key: "escalate" },
      ]
    case "Credentials Expired":
      return [
        { label: "Renew Credentials", icon: <KeyRound size={11} />, variant: "primary", key: "renew-creds" },
        { label: "Manual Booking", icon: <FileWarning size={11} />, variant: "warning", key: "manual-book" },
      ]
    default:
      return []
  }
}

// ── Email builders ──────────────────────────────────────────────────────

function getRecipient(bookingId: string) {
  return NOTIFY_RECIPIENTS[bookingId] ?? { name: "Operations Team", email: "ops@company.com" }
}

function buildNotifyBody(s: Shipment, recipientName: string): string {
  return `Dear ${recipientName} Team,

We are writing to inform you of a booking exception affecting your shipment.

Booking ID:     ${s.id}
Carrier:        ${s.carrier}
Lane:           ${s.lane}
Container:      ${s.containerType}
SAP Order:      ${s.sapOrderRef}
Target Ship:    ${s.targetShipDate}
Exception:      ${s.exceptionType}

Summary: ${s.agentSummary}

Recommended Action: ${s.recommendedAction}

We are actively working to resolve this exception. Please plan accordingly.

Best regards,
Zero Touch Booking Agent`
}

function buildCarrierInquiryBody(s: Shipment): string {
  const carrier = CARRIER_OPS[s.id] ?? { name: s.carrier }
  return `Dear ${carrier.name},

We are following up on booking ${s.id} which has encountered an exception.

Booking:      ${s.id}
Lane:         ${s.lane}
Container:    ${s.containerType}
Exception:    ${s.exceptionType}
Target Ship:  ${s.targetShipDate}

${s.exceptionType === "Carrier Rejection"
    ? "Your team declined this booking. Could you provide:\n1. Reason for rejection\n2. Earliest available sailing\n3. Alternative routing options"
    : s.exceptionType === "Rate Mismatch"
    ? "The quoted rate exceeds our contract rate. Could you provide:\n1. Justification for the rate premium\n2. Any available discounts or alternative sailings\n3. Contract rate availability for the next sailing window"
    : "Could you provide:\n1. Current booking status\n2. Available capacity for our shipment\n3. Any alternative options"}

Our planner requires a response within 4 hours.

Best regards,
Zero Touch Booking Agent`
}

function buildEscalationBody(s: Shipment): string {
  return `Dear VP Operations,

We are escalating booking ${s.id} due to ${s.severity.toLowerCase()} severity impact on operations.

Booking:        ${s.id}
Carrier:        ${s.carrier}
Lane:           ${s.lane}
Exception:      ${s.exceptionType}
Target Ship:    ${s.targetShipDate}
Plant Impact:   ${s.plant}

Summary: ${s.agentSummary}

Recommended Action: ${s.recommendedAction}

Immediate escalation is required to minimize further exposure. Please advise on carrier escalation authority and any contingency approvals needed.

Zero Touch Booking Agent`
}

function buildRerouteApprovalBody(s: Shipment, option: RerouteOption): string {
  return `Dear ${CARRIER_OPS[s.id]?.name ?? s.carrier} Team,

Following our review of alternate carrier options for booking ${s.id}, we are approving the following:

Booking:          ${s.id}
Approved Carrier: ${option.carrier}
Route:            ${option.route}
Transit Days:     ${option.transitDays}
Rate:             $${option.rate.toLocaleString()}
Savings:          ${option.savings}

Please proceed with booking and issue confirmation. Confirm acceptance and provide booking reference.

Best regards,
Zero Touch Booking Agent`
}

function buildApprovalNotifyBody(s: Shipment, decision: string, detail: string): string {
  return `Dear Operations Team,

A human approval decision has been made for booking ${s.id}.

Booking:      ${s.id}
Lane:         ${s.lane}
Decision:     ${decision}
Detail:       ${detail}

The booking agent will proceed accordingly.

Zero Touch Booking Agent`
}

function getTimestamp(): string {
  const now = new Date()
  const m = now.toLocaleDateString("en", { month: "short", day: "numeric" })
  const t = now.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false })
  return `${m}, ${t}`
}

// ── Main Component ──────────────────────────────────────────────────────

interface ExceptionWorkbenchProps {
  onSendNotification?: (email: SentEmailItem) => void
  onOpenWeather?: (shipmentId: string) => void
  onExceptionResolved?: (shipmentId: string) => void
}

export function ExceptionWorkbench({ onSendNotification, onOpenWeather, onExceptionResolved }: ExceptionWorkbenchProps) {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())
  const [severityFilter, setSeverityFilter] = useState<Severity | "All">("All")
  const [exceptionFilter, setExceptionFilter] = useState<ExceptionType | "All">("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("severity")
  const [actions, setActions] = useState<AllActions>({})
  const [approvals, setApprovals] = useState<AllApprovals>({})

  // Processing state for AI actions
  const [processing, setProcessing] = useState<Set<string>>(new Set())

  // Modal state
  const [composeBooking, setComposeBooking] = useState<Shipment | null>(null)
  const [composeType, setComposeType] = useState<"plant" | "carrier">("plant")
  const [escalateBooking, setEscalateBooking] = useState<Shipment | null>(null)
  const [rerouteBooking, setRerouteBooking] = useState<Shipment | null>(null)
  const [drawerShipment, setDrawerShipment] = useState<Shipment | null>(null)
  const [missingFieldsBooking, setMissingFieldsBooking] = useState<Shipment | null>(null)

  const getActions = (id: string): WorkbenchCardActions =>
    actions[id] ?? { ...DEFAULT_ACTIONS }

  const updateAction = (id: string, patch: Partial<WorkbenchCardActions>) => {
    setActions((prev) => ({
      ...prev,
      [id]: { ...getActions(id), ...patch },
    }))
  }

  const getApproval = (id: string): ApprovalState =>
    approvals[id] ?? { ...DEFAULT_APPROVAL }

  const updateApproval = (id: string, patch: Partial<ApprovalState>) => {
    setApprovals((prev) => ({
      ...prev,
      [id]: { ...getApproval(id), ...patch },
    }))
  }

  // Filter: only Exception and Awaiting Approval bookings
  const exceptionBookings = SHIPMENTS
    .filter((s) => {
      if (resolvedIds.has(s.id)) return false
      if (s.bookingStatus !== "Exception") return false
      if (severityFilter !== "All" && s.severity !== severityFilter) return false
      if (exceptionFilter !== "All" && s.exceptionType !== exceptionFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return s.id.toLowerCase().includes(q) ||
          s.carrier.toLowerCase().includes(q) ||
          s.lane.toLowerCase().includes(q) ||
          s.plant.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === "severity") return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      if (sortBy === "lane") return a.lane.localeCompare(b.lane)
      if (sortBy === "date") return a.requestedDate.localeCompare(b.requestedDate)
      return 0
    })

  const approvalBookings = SHIPMENTS
    .filter((s) => {
      if (resolvedIds.has(s.id)) return false
      if (s.bookingStatus !== "Awaiting Approval") return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return s.id.toLowerCase().includes(q) ||
          s.carrier.toLowerCase().includes(q) ||
          s.lane.toLowerCase().includes(q) ||
          s.plant.toLowerCase().includes(q)
      }
      return true
    })

  // Also include DD_RISKS items that point to Exception bookings with approvalType != None
  const ddRiskBookings = DD_RISKS
    .filter((r) => r.status === "pending" && !resolvedIds.has(r.shipmentId))
    .map((risk) => ({
      risk,
      booking: SHIPMENTS.find((s) => s.id === risk.shipmentId),
    }))
    .filter((item) => item.booking != null)

  const totalItems = exceptionBookings.length + approvalBookings.length

  // Unfiltered counts for header KPIs (not affected by active filters)
  const allExceptionBookings = SHIPMENTS.filter(s => !resolvedIds.has(s.id) && s.bookingStatus === "Exception")
  const criticalCount = allExceptionBookings.filter(s => s.severity === "Critical").length
  const highCount = allExceptionBookings.filter(s => s.severity === "High").length
  const pendingApprovalCount = approvalBookings.length + ddRiskBookings.length

  // Per-requirement-type counts (the 5 core exception scenarios)
  const REQ_TYPES = [
    { key: "Missing Allocation",    label: "Missing Allocation",     sev: "High",     color: "text-amber-700 bg-amber-50 border-amber-200" },
    { key: "Portal Unavailable",    label: "Portal/API Unavail.",    sev: "High",     color: "text-purple-700 bg-purple-50 border-purple-200" },
    { key: "Credentials Expired",   label: "+ Credentials",          sev: "High",     color: "text-purple-600 bg-purple-50 border-purple-200" },
    { key: "Rate Mismatch",         label: "Rate Mismatch",          sev: "High",     color: "text-orange-700 bg-orange-50 border-orange-200" },
    { key: "Missing Booking Fields",label: "Missing Fields",         sev: "Medium",   color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
    { key: "Carrier Rejection",     label: "Carrier Rejection",      sev: "Critical", color: "text-red-700 bg-red-50 border-red-200" },
  ] as const
  const reqCounts = REQ_TYPES.map(t => ({
    ...t,
    count: allExceptionBookings.filter(s => s.exceptionType === t.key).length
  }))

  // ── Handlers ──────────────────────────────────────────────────────────

  const openNotify = (s: Shipment) => {
    setComposeType("plant")
    setComposeBooking(s)
  }

  const openCarrierInquiry = (s: Shipment) => {
    setComposeType("carrier")
    setComposeBooking(s)
  }

  const handleSendNotify = (body: string) => {
    if (!composeBooking) return
    const isCarrier = composeType === "carrier"
    const recipient = isCarrier
      ? (CARRIER_OPS[composeBooking.id] ?? { name: composeBooking.carrier, email: "ops@carrier.com" })
      : getRecipient(composeBooking.id)
    const email: SentEmailItem = {
      id: `SE-WB-${composeBooking.id}-${Date.now()}`,
      to: `${recipient.name} <${recipient.email}>`,
      subject: isCarrier
        ? `Booking Inquiry — ${composeBooking.id} — ${composeBooking.exceptionType}`
        : `Booking Exception — ${composeBooking.id} — ${composeBooking.exceptionType}`,
      body,
      timestamp: getTimestamp(),
      type: isCarrier ? "carrier" : "plant",
    }
    onSendNotification?.(email)
    updateAction(composeBooking.id, isCarrier ? { actionTaken: "carrier-inquiry" } : { notified: true })
    setComposeBooking(null)
  }

  const handleSendEscalation = (body: string) => {
    if (!escalateBooking) return
    const recipient = ESCALATION_RECIPIENTS[escalateBooking.id] ?? { name: "VP Operations", email: "vp-ops@company.com" }
    const email: SentEmailItem = {
      id: `SE-ESC-${escalateBooking.id}-${Date.now()}`,
      to: `${recipient.name} <${recipient.email}>`,
      subject: `Escalation — ${escalateBooking.id} — ${escalateBooking.severity} ${escalateBooking.exceptionType}`,
      body,
      timestamp: getTimestamp(),
      type: "escalation",
    }
    onSendNotification?.(email)
    updateAction(escalateBooking.id, { escalated: true })
    setEscalateBooking(null)
  }

  const handleApproveReroute = (shipment: Shipment, option: RerouteOption) => {
    const carrier = CARRIER_OPS[shipment.id] ?? { name: shipment.carrier, email: "ops@carrier.com" }
    const email: SentEmailItem = {
      id: `SE-REROUTE-${shipment.id}-${Date.now()}`,
      to: `${carrier.name} <${carrier.email}>`,
      subject: `Alternate Carrier Approved — ${shipment.id} — ${option.carrier}`,
      body: buildRerouteApprovalBody(shipment, option),
      timestamp: getTimestamp(),
      type: "carrier",
    }
    onSendNotification?.(email)
    updateAction(shipment.id, { rerouteApproved: option.id })
    setRerouteBooking(null)
  }

  const handleExceptionAction = (s: Shipment, actionKey: string) => {
    // Simulate AI processing
    setProcessing((prev) => new Set([...prev, `${s.id}-${actionKey}`]))
    setTimeout(() => {
      setProcessing((prev) => {
        const n = new Set(prev)
        n.delete(`${s.id}-${actionKey}`)
        return n
      })
      updateAction(s.id, { actionTaken: actionKey })

      // Actions open modals / compose flows
      if (actionKey === "alt-carrier" || actionKey === "reroute") {
        setRerouteBooking(s)
      } else if (actionKey === "escalate") {
        setEscalateBooking(s)
      } else if (actionKey === "flag-negotiate" || actionKey === "negotiate") {
        openCarrierInquiry(s)
      } else if (actionKey === "request-planner") {
        openNotify(s)
      } else if (actionKey === "request-alloc") {
        openCarrierInquiry(s)
      } else if (actionKey === "accept-rate") {
        openNotify(s)
      } else if (actionKey === "pull-sap" || actionKey === "auto-fill") {
        setMissingFieldsBooking(s)
      } else if (actionKey === "manual-book") {
        openCarrierInquiry(s)
      }
    }, 1200)
  }

  const handleApprovalDecision = (bookingId: string, decision: string, detail: string) => {
    updateApproval(bookingId, { approved: true, decision })
    const booking = SHIPMENTS.find((s) => s.id === bookingId)
    if (booking) {
      const recipient = getRecipient(bookingId)
      const email: SentEmailItem = {
        id: `SE-APR-${bookingId}-${Date.now()}`,
        to: `${recipient.name} <${recipient.email}>`,
        subject: `Approval Decision — ${bookingId} — ${decision}`,
        body: buildApprovalNotifyBody(booking, decision, detail),
        timestamp: getTimestamp(),
        type: "plant",
      }
      onSendNotification?.(email)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
              <ShieldAlert size={18} className="text-red-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Exception Workbench</h1>
              <p className="text-xs text-gray-400">AI-detected booking exceptions · human review &amp; override</p>
            </div>
          </div>
          {/* KPI Stat Pills */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {criticalCount > 0 && (
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-semibold text-red-700">{criticalCount} Critical</span>
              </div>
            )}
            {highCount > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span className="text-xs font-semibold text-orange-700">{highCount} High</span>
              </div>
            )}
            {pendingApprovalCount > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                <ClipboardList size={11} className="text-amber-600" />
                <span className="text-xs font-semibold text-amber-700">{pendingApprovalCount} Awaiting Approval</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              <CheckCircle size={11} className="text-green-600" />
              <span className="text-xs font-semibold text-green-700">{resolvedIds.size} Resolved</span>
            </div>
          </div>
        </div>

        {/* AI Agent Status bar */}
        <div className="flex items-center gap-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg px-4 py-2">
          <Brain size={13} className="text-indigo-600 shrink-0" />
          <span className="text-[11px] font-semibold text-indigo-700">Agent Status:</span>
          <span className="text-[11px] text-indigo-600">Scanning {SHIPMENTS.filter(s => !resolvedIds.has(s.id)).length} active bookings</span>
          <span className="text-[10px] text-indigo-300 mx-1">·</span>
          {criticalCount > 0 ? (
            <span className="text-[11px] text-red-600 font-semibold">{criticalCount} critical exception{criticalCount !== 1 ? "s" : ""} {criticalCount !== 1 ? "require" : "requires"} immediate action</span>
          ) : (
            <span className="text-[11px] text-green-600 font-semibold">No critical exceptions active</span>
          )}
          <span className="text-[10px] text-indigo-300 mx-1">·</span>
          <span className="text-[11px] text-indigo-500">Last scan: 2 min ago</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] text-green-600 font-semibold">Active</span>
          </div>
        </div>

        {/* 5-type requirements breakdown strip */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider shrink-0 mr-1">Exception Types:</span>
          {reqCounts.map((t) => (
            <button
              key={t.key}
              onClick={() => setExceptionFilter(t.key as ExceptionType | "All")}
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5 transition-colors hover:opacity-80",
                t.color,
                exceptionFilter === t.key ? "ring-1 ring-offset-0 ring-current" : ""
              )}
            >
              {t.label}
              <span className="font-bold">{t.count}</span>
              <span className="font-normal opacity-60">· {t.sev}</span>
            </button>
          ))}
          {exceptionFilter !== "All" && (
            <button
              onClick={() => setExceptionFilter("All")}
              className="text-[10px] text-gray-400 hover:text-gray-600 underline ml-1"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* ── Filter + sort bar ─────────────────────────────────────────── */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-4 flex-wrap">
        <Filter size={13} className="text-gray-400" />
        <FilterPills label="Severity" options={["All", "Critical", "High", "Medium", "Low"]} value={severityFilter} onChange={setSeverityFilter} />
        <div className="w-px h-4 bg-gray-200" />
        <FilterPills
          label="Exception"
          options={["All", "Missing Allocation", "Portal Unavailable", "Rate Mismatch", "Missing Booking Fields", "Carrier Rejection", "Credentials Expired"]}
          value={exceptionFilter}
          onChange={setExceptionFilter}
        />
        <div className="w-px h-4 bg-gray-200" />
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 pr-3 py-1 rounded border border-gray-200 text-[11px] text-gray-700 w-40 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={10} />
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ArrowUpDown size={12} className="text-gray-400" />
          <span className="text-[11px] text-gray-500 font-medium">Sort:</span>
          {(["severity", "lane", "date"] as SortBy[]).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium transition-colors capitalize",
                sortBy === s ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Exception cards ───────────────────────────────────────────── */}
      <div className="p-6 space-y-6">
        {totalItems === 0 && ddRiskBookings.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            No exceptions or approvals match the current filters.
          </div>
        ) : (
          <>
            {/* ── Exception Cards ──────────────────────────────────── */}
            {exceptionBookings.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertOctagon size={14} className="text-red-500" />
                  <h3 className="text-sm font-bold text-gray-800">Booking Exceptions</h3>
                  <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                    {exceptionBookings.length}
                  </span>
                </div>
                <div className="grid gap-3">
                  {exceptionBookings.map((s) => {
                    const acts = getActions(s.id)
                    return (
                      <ExceptionCard
                        key={s.id}
                        booking={s}
                        actions={acts}
                        processing={processing}
                        onAcknowledge={() => updateAction(s.id, { acknowledged: true })}
                        onNotifyClick={() => openNotify(s)}
                        onExceptionAction={(actionKey) => handleExceptionAction(s, actionKey)}
                        onEscalate={() => setEscalateBooking(s)}
                        onReviewReroute={() => setRerouteBooking(s)}
                        onViewDetail={() => setDrawerShipment(s)}
                        onViewPortal={() => onOpenWeather?.(s.id)}
                        onResolve={() => {
                          setResolvedIds((prev) => new Set([...prev, s.id]))
                          onExceptionResolved?.(s.id)
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Human Approval Cards ─────────────────────────────── */}
            {(approvalBookings.length > 0 || ddRiskBookings.length > 0) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert size={14} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-gray-800">Human Approvals Required</h3>
                  <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                    {approvalBookings.length + ddRiskBookings.filter(d => !approvalBookings.find(a => a.id === d.risk.shipmentId)).length}
                  </span>
                </div>
                <div className="grid gap-3">
                  {/* Approval bookings from SHIPMENTS with Awaiting Approval status */}
                  {approvalBookings.map((s) => {
                    const approval = getApproval(s.id)
                    const ddRisk = DD_RISKS.find((r) => r.shipmentId === s.id)
                    return (
                      <ApprovalCard
                        key={s.id}
                        booking={s}
                        approval={approval}
                        ddRisk={ddRisk}
                        onApprove={(decision, detail) => handleApprovalDecision(s.id, decision, detail)}
                        onOverride={(decision, detail) => {
                          updateApproval(s.id, { overridden: true, decision })
                          handleApprovalDecision(s.id, decision, detail)
                        }}
                        onViewDetail={() => setDrawerShipment(s)}
                        onViewPortal={() => onOpenWeather?.(s.id)}
                        onEscalate={() => setEscalateBooking(s)}
                        onReviewReroute={() => setRerouteBooking(s)}
                        onResolve={() => {
                          setResolvedIds((prev) => new Set([...prev, s.id]))
                          onExceptionResolved?.(s.id)
                        }}
                      />
                    )
                  })}

                  {/* DD_RISKS items for Exception bookings that have approvalType != "None" and aren't already shown as Awaiting Approval */}
                  {ddRiskBookings
                    .filter((d) => !approvalBookings.find((a) => a.id === d.risk.shipmentId))
                    .map(({ risk, booking }) => {
                      if (!booking) return null
                      const approval = getApproval(booking.id)
                      return (
                        <ApprovalCard
                          key={`dd-${risk.shipmentId}`}
                          booking={booking}
                          approval={approval}
                          ddRisk={risk}
                          onApprove={(decision, detail) => handleApprovalDecision(booking.id, decision, detail)}
                          onOverride={(decision, detail) => {
                            updateApproval(booking.id, { overridden: true, decision })
                            handleApprovalDecision(booking.id, decision, detail)
                          }}
                          onViewDetail={() => setDrawerShipment(booking)}
                          onViewPortal={() => onOpenWeather?.(booking.id)}
                          onEscalate={() => setEscalateBooking(booking)}
                          onReviewReroute={() => setRerouteBooking(booking)}
                          onResolve={() => {
                            setResolvedIds((prev) => new Set([...prev, booking.id]))
                            onExceptionResolved?.(booking.id)
                          }}
                        />
                      )
                    })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}

      {composeBooking && (
        <NotifyComposeModal
          booking={composeBooking}
          composeType={composeType}
          onClose={() => setComposeBooking(null)}
          onSend={handleSendNotify}
        />
      )}

      {escalateBooking && (
        <EscalateModal
          booking={escalateBooking}
          onClose={() => setEscalateBooking(null)}
          onSend={handleSendEscalation}
        />
      )}

      {rerouteBooking && (
        <ReroutePanel
          booking={rerouteBooking}
          approvedId={getActions(rerouteBooking.id).rerouteApproved}
          onClose={() => setRerouteBooking(null)}
          onApprove={(option) => handleApproveReroute(rerouteBooking, option)}
        />
      )}

      {missingFieldsBooking && (
        <MissingFieldsModal
          booking={missingFieldsBooking}
          onClose={() => setMissingFieldsBooking(null)}
          onSave={(s) => {
            setMissingFieldsBooking(null)
            setResolvedIds((prev) => new Set([...prev, s.id]))
            onExceptionResolved?.(s.id)
            openNotify(s)
          }}
        />
      )}

      <ShipmentDrawer
        shipment={drawerShipment}
        onClose={() => setDrawerShipment(null)}
        onOpenWeather={onOpenWeather}
      />
    </div>
  )
}

// ── Exception Card ──────────────────────────────────────────────────────

interface ExceptionCardProps {
  booking: Shipment
  actions: WorkbenchCardActions
  processing: Set<string>
  onAcknowledge: () => void
  onNotifyClick: () => void
  onExceptionAction: (actionKey: string) => void
  onEscalate: () => void
  onReviewReroute: () => void
  onViewDetail: () => void
  onViewPortal: () => void
  onResolve: () => void
}

function ExceptionCard({
  booking: s,
  actions,
  processing,
  onAcknowledge,
  onNotifyClick,
  onExceptionAction,
  onEscalate,
  onReviewReroute,
  onViewDetail,
  onViewPortal,
  onResolve,
}: ExceptionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const allDone = actions.acknowledged && actions.actionTaken !== null
  const hasRouteOptions = !!REROUTE_OPTIONS[s.id]
  const exceptionActions = getExceptionActions(s.exceptionType)

  return (
    <div
      onClick={onViewDetail}
      className={cn(
        "bg-white rounded-lg border p-4 transition-all cursor-pointer hover:shadow-md hover:border-blue-300 group",
        s.severity === "Critical" ? "border-l-4 border-l-red-500 border-r border-t border-b border-gray-200" :
          s.severity === "High" ? "border-l-4 border-l-amber-400 border-r border-t border-b border-gray-200" :
            "border border-gray-200",
        allDone ? "opacity-60" : ""
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <SeverityBadge severity={s.severity} />
            <ModeBadge mode={s.mode} />
            <span className="font-mono font-bold text-blue-700 text-sm group-hover:underline">{s.id}</span>
            <ExceptionBadge type={s.exceptionType} />
            {s.carrier !== "—" && <CarrierBadge carrier={s.carrier} />}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-2">
            <InfoItem label="Lane" value={s.lane} mono />
            <InfoItem label="Container" value={s.containerType} />
            <InfoItem label="SAP Order" value={s.sapOrderRef} mono />
            <InfoItem label="Target Ship" value={s.targetShipDate} />
          </div>

          {/* Exception description */}
          <div className="flex items-center gap-2 mb-2">
            <ExceptionIcon type={s.exceptionType} size={12} />
            <span className="text-xs font-medium text-gray-700">
              {EXCEPTION_DESCRIPTIONS[s.exceptionType]}
            </span>
          </div>

          {/* Portal status link for Portal/API Unavailability (covers both Portal Unavailable + Credentials Expired) */}
          {(s.exceptionType === "Portal Unavailable" || s.exceptionType === "Credentials Expired") && (
            <div className="mb-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-200" onClick={(e) => e.stopPropagation()}>
              <Globe size={11} className="text-purple-600 shrink-0" />
              <span className="text-[10px] text-purple-700 font-medium flex-1">
                {s.exceptionType === "Credentials Expired" ? "Portal credentials expired — re-auth required" : "Portal currently unavailable"}
                <span className="ml-1.5 text-purple-400 font-normal">· Portal/API Unavailability</span>
              </span>
              <button
                onClick={onViewPortal}
                className="text-[10px] font-semibold text-purple-700 hover:text-purple-900 underline shrink-0"
              >
                View Portal Status →
              </button>
            </div>
          )}

          {/* Carrier policy for Carrier Rejection */}
          {s.exceptionType === "Carrier Rejection" && CARRIER_POLICIES[s.carrier] && (
            <CarrierPolicySection carrier={s.carrier} booking={s} />
          )}

          {/* Agent summary */}
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{s.agentSummary}</p>

          {/* Recommended action */}
          <div className="flex items-center gap-1.5 mb-2 text-[10px]">
            <Brain size={10} className="text-indigo-500 shrink-0" />
            <span className="text-indigo-700 font-medium">{s.recommendedAction}</span>
          </div>

          {/* Approved reroute callout */}
          {actions.rerouteApproved && (
            <div className="mb-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-[10px] text-green-700">
              <CheckCircle size={10} />
              <span>Alternate carrier approved — {REROUTE_OPTIONS[s.id]?.find((o) => o.id === actions.rerouteApproved)?.carrier} · Notification sent</span>
            </div>
          )}

          {/* Reason chips & sources */}
          <div className="flex items-center gap-2 flex-wrap">
            <ReasonChips chips={s.reasonChips} />
          </div>

          {/* Expanded detail */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2" onClick={(e) => e.stopPropagation()}>
              <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Signal Sources</div>
              <div className="flex flex-wrap gap-1">
                {s.sources.map((src) => (
                  <SourceBadge key={src.source} source={src.source} />
                ))}
              </div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-2">Carrier Options</div>
              <div className="grid gap-1.5">
                {s.carrierOptions.slice(0, 3).map((opt) => (
                  <div key={opt.carrier} className="flex items-center gap-3 text-[10px] text-gray-600 px-2 py-1 rounded bg-gray-50">
                    <span className="font-medium w-20">{opt.carrier}</span>
                    <span className="font-mono">${opt.rate.toLocaleString()}</span>
                    <span className="text-gray-400">{opt.transitDays}d</span>
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                      opt.capacity === "Available" ? "bg-green-100 text-green-700" :
                        opt.capacity === "Limited" ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                    )}>{opt.capacity}</span>
                    {opt.recommended && (
                      <span className="text-[9px] font-bold bg-blue-600 text-white rounded-full px-1.5 py-0.5">AI Pick</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: impact */}
        <div className="shrink-0 text-right space-y-1 min-w-[130px]">
          <div className="text-[10px] text-gray-400">Impacted Plant</div>
          <div className="text-xs font-medium text-gray-700 max-w-[150px] text-right">{s.plant}</div>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
            className="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5 ml-auto"
          >
            {expanded ? "Collapse" : "Details"}
            <ChevronRight size={10} className={cn("transition-transform", expanded ? "rotate-90" : "")} />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 mt-3 pt-3 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <WorkbenchAction
          label={actions.acknowledged ? "Acknowledged" : "Acknowledge"}
          done={actions.acknowledged}
          icon={<CheckCircle size={11} />}
          onClick={onAcknowledge}
          variant="secondary"
        />
        <WorkbenchAction
          label={actions.notified ? "Plant Notified" : "Notify Plant"}
          done={actions.notified}
          icon={<Send size={11} />}
          onClick={onNotifyClick}
          variant="primary"
        />

        {/* Exception-specific actions */}
        {exceptionActions.map((action) => {
          const isProcessing = processing.has(`${s.id}-${action.key}`)
          const isDone = actions.actionTaken === action.key
          // "alt-carrier" and "reroute" open the reroute panel
          const isRouteAction = action.key === "alt-carrier" || action.key === "reroute"
          return (
            <WorkbenchAction
              key={action.key}
              label={isProcessing ? "Processing..." : isDone ? `${action.label} \u2713` : action.label}
              done={isDone}
              icon={isProcessing ? <Brain size={11} className="animate-pulse" /> : isDone ? <CheckCircle size={11} /> : action.icon}
              onClick={() => {
                if (isRouteAction && hasRouteOptions) {
                  onReviewReroute()
                } else if (action.key === "escalate") {
                  onEscalate()
                } else {
                  onExceptionAction(action.key)
                }
              }}
              variant={isDone ? "success" : action.variant}
            />
          )
        })}

        {/* Reroute review if route options exist and not already an explicit exception action */}
        {hasRouteOptions && !exceptionActions.find((a) => a.key === "alt-carrier" || a.key === "reroute") && (
          <WorkbenchAction
            label={actions.rerouteApproved ? "Route Approved" : "Review Alternates"}
            done={!!actions.rerouteApproved}
            icon={<GitBranch size={11} />}
            onClick={onReviewReroute}
            variant={actions.rerouteApproved ? "success" : "route"}
          />
        )}

        <WorkbenchAction
          label={actions.escalated ? "Escalated" : "Escalate"}
          done={actions.escalated}
          icon={<AlertOctagon size={11} />}
          onClick={onEscalate}
          variant="danger"
        />

        {allDone && (
          <button
            onClick={onResolve}
            className="ml-auto text-[10px] font-semibold flex items-center gap-1 text-white bg-green-600 hover:bg-green-700 rounded-md px-2.5 py-1 transition-colors"
          >
            <CheckCircle size={11} /> Resolve Exception
          </button>
        )}
      </div>
    </div>
  )
}

// ── Human Approval Card ─────────────────────────────────────────────────

interface ApprovalCardProps {
  booking: Shipment
  approval: ApprovalState
  ddRisk?: DDRisk
  onApprove: (decision: string, detail: string) => void
  onOverride: (decision: string, detail: string) => void
  onViewDetail: () => void
  onViewPortal: () => void
  onEscalate: () => void
  onReviewReroute: () => void
  onResolve: () => void
}

function ApprovalCard({
  booking: s,
  approval,
  ddRisk,
  onApprove,
  onOverride,
  onViewDetail,
  onViewPortal,
  onEscalate,
  onReviewReroute,
  onResolve,
}: ApprovalCardProps) {
  const approvalType = s.approvalType !== "None" ? s.approvalType : (ddRisk?.type as ApprovalType | undefined) ?? "None"
  const hasRouteOptions = !!REROUTE_OPTIONS[s.id]

  return (
    <div
      onClick={onViewDetail}
      className={cn(
        "bg-white rounded-lg border p-4 transition-all cursor-pointer hover:shadow-md hover:border-amber-300 group",
        "border-l-4 border-l-amber-400 border-r border-t border-b border-gray-200",
        approval.approved ? "opacity-60" : ""
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              Awaiting Approval
            </span>
            <ModeBadge mode={s.mode} />
            <span className="font-mono font-bold text-blue-700 text-sm group-hover:underline">{s.id}</span>
            {s.carrier !== "—" && <CarrierBadge carrier={s.carrier} />}
            <span className="inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
              {approvalType}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-2">
            <InfoItem label="Lane" value={s.lane} mono />
            <InfoItem label="Container" value={s.containerType} />
            <InfoItem label="SAP Order" value={s.sapOrderRef} mono />
            <InfoItem label="Target Ship" value={s.targetShipDate} />
          </div>

          {/* Approval-type specific content */}
          {approvalType === "Carrier Override" && (
            <CarrierOverrideContent booking={s} approval={approval} onApprove={onApprove} onOverride={onOverride} />
          )}

          {approvalType === "Booking Rejection" && (
            <BookingRejectionContent booking={s} approval={approval} onApprove={onApprove} hasRouteOptions={hasRouteOptions} onReviewReroute={onReviewReroute} onEscalate={onEscalate} />
          )}

          {approvalType === "Spot Booking" && (
            <SpotBookingContent booking={s} approval={approval} onApprove={onApprove} onOverride={onOverride} />
          )}

          {/* Agent summary */}
          <p className="text-xs text-gray-600 mb-2 mt-2">{s.agentSummary}</p>

          {/* Reason chips */}
          <ReasonChips chips={s.reasonChips} />

          {/* Approval decision callout */}
          {approval.approved && (
            <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-[10px] text-green-700">
              <CheckCircle size={10} />
              <span>Decision: {approval.decision} — Notification sent</span>
            </div>
          )}
        </div>

        {/* Right section */}
        <div className="shrink-0 text-right space-y-1 min-w-[130px]">
          <div className="text-[10px] text-gray-400">Impacted Plant</div>
          <div className="text-xs font-medium text-gray-700 max-w-[150px] text-right">{s.plant}</div>
          {ddRisk && (
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
              ddRisk.urgency === "High" ? "bg-red-100 text-red-700" :
                ddRisk.urgency === "Medium" ? "bg-amber-100 text-amber-700" :
                  "bg-gray-100 text-gray-600"
            )}>
              {ddRisk.urgency} Urgency
            </span>
          )}
        </div>
      </div>

      {/* Resolve button */}
      {approval.approved && (
        <div className="border-t border-gray-100 mt-3 pt-3 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onResolve}
            className="text-[10px] font-semibold flex items-center gap-1 text-white bg-green-600 hover:bg-green-700 rounded-md px-2.5 py-1 transition-colors"
          >
            <CheckCircle size={11} /> Mark Resolved
          </button>
        </div>
      )}
    </div>
  )
}

// ── Carrier Override Content ────────────────────────────────────────────

function CarrierOverrideContent({ booking: s, approval, onApprove, onOverride }: {
  booking: Shipment
  approval: ApprovalState
  onApprove: (decision: string, detail: string) => void
  onOverride: (decision: string, detail: string) => void
}) {
  const aiPick = s.carrierOptions.find((o) => o.recommended)
  const historicalPick = s.carrierOptions.find((o) => !o.recommended && o.carrier !== aiPick?.carrier)

  if (approval.approved) return null

  return (
    <div className="mb-2 space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">AI Recommendation vs Historical Preference</div>
      <div className="grid grid-cols-2 gap-2">
        {/* AI Pick */}
        {aiPick && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Brain size={10} className="text-blue-600" />
              <span className="text-[10px] font-bold text-blue-700">AI Recommended</span>
            </div>
            <div className="space-y-0.5 text-[10px] text-gray-700">
              <div className="font-semibold">{aiPick.carrier}</div>
              <div>Rate: <span className="font-mono">${aiPick.rate.toLocaleString()}</span> <span className="text-gray-400">(contract: ${aiPick.contractRate.toLocaleString()})</span></div>
              <div>Transit: {aiPick.transitDays}d &middot; SLA: {aiPick.sla}%</div>
              {aiPick.reason && <div className="text-[9px] text-blue-600 mt-1">{aiPick.reason}</div>}
            </div>
            <button
              onClick={() => onApprove("Approve AI Recommendation", `Approved ${aiPick.carrier} at $${aiPick.rate}`)}
              className="mt-2 w-full text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded px-2 py-1 flex items-center justify-center gap-1 transition-colors"
            >
              <ThumbsUp size={10} /> Approve
            </button>
          </div>
        )}

        {/* Historical */}
        {historicalPick && (
          <div className="rounded-lg border border-gray-200 bg-gray-50/40 p-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BarChart3 size={10} className="text-gray-600" />
              <span className="text-[10px] font-bold text-gray-700">Historical Preference</span>
            </div>
            <div className="space-y-0.5 text-[10px] text-gray-700">
              <div className="font-semibold">{historicalPick.carrier}</div>
              <div>Rate: <span className="font-mono">${historicalPick.rate.toLocaleString()}</span> <span className="text-gray-400">(contract: ${historicalPick.contractRate.toLocaleString()})</span></div>
              <div>Transit: {historicalPick.transitDays}d &middot; SLA: {historicalPick.sla}%</div>
            </div>
            <button
              onClick={() => onOverride("Override to Historical", `Override to ${historicalPick.carrier} at $${historicalPick.rate}`)}
              className="mt-2 w-full text-[10px] font-semibold text-gray-700 border border-gray-300 hover:bg-gray-100 rounded px-2 py-1 flex items-center justify-center gap-1 transition-colors"
            >
              <ArrowRightLeft size={10} /> Override
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Booking Rejection Content ───────────────────────────────────────────

function BookingRejectionContent({ booking: s, approval, onApprove, hasRouteOptions, onReviewReroute, onEscalate }: {
  booking: Shipment
  approval: ApprovalState
  onApprove: (decision: string, detail: string) => void
  hasRouteOptions: boolean
  onReviewReroute: () => void
  onEscalate: () => void
}) {
  if (approval.approved) return null

  return (
    <div className="mb-2 space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
        <Ban size={12} className="text-red-600 shrink-0" />
        <span className="text-[10px] text-red-700 font-medium">
          {s.carrier} rejected this booking — alternate carrier required
        </span>
      </div>

      {/* Alternate carrier options */}
      {hasRouteOptions && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Alternate Carriers Available</div>
          {REROUTE_OPTIONS[s.id]?.slice(0, 3).map((opt) => (
            <div key={opt.id} className="flex items-center gap-3 text-[10px] text-gray-700 px-2.5 py-1.5 rounded bg-gray-50 border border-gray-100">
              <span className="font-semibold w-28">{opt.carrier}</span>
              <span className="font-mono">{opt.route}</span>
              <span className="text-gray-500">{opt.transitDays}d</span>
              <span className="font-mono">${opt.rate.toLocaleString()}</span>
              <span className="text-gray-400 text-[9px]">{opt.savings}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        {hasRouteOptions && (
          <button
            onClick={onReviewReroute}
            className="text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded px-2.5 py-1 flex items-center gap-1 transition-colors"
          >
            <GitBranch size={10} /> Approve Re-route
          </button>
        )}
        <button
          onClick={onEscalate}
          className="text-[10px] font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded px-2.5 py-1 flex items-center gap-1 transition-colors"
        >
          <AlertOctagon size={10} /> Escalate
        </button>
      </div>
    </div>
  )
}

// ── Spot Booking Content ────────────────────────────────────────────────

function SpotBookingContent({ booking: s, approval, onApprove, onOverride }: {
  booking: Shipment
  approval: ApprovalState
  onApprove: (decision: string, detail: string) => void
  onOverride: (decision: string, detail: string) => void
}) {
  const [tolerance, setTolerance] = useState(10)
  const spotCarrier = s.carrierOptions.find((o) => !o.recommended && o.rate > o.contractRate)
    ?? s.carrierOptions[0]
  const contractCarrier = s.carrierOptions.find((o) => o.recommended) ?? s.carrierOptions[1]

  if (approval.approved || !spotCarrier) return null

  const delta = spotCarrier.rate - spotCarrier.contractRate
  const pctDelta = ((delta / spotCarrier.contractRate) * 100)
  const withinTolerance = pctDelta <= tolerance

  return (
    <div className="mb-2 space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Spot vs Contract Rate Comparison</div>
      <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <DollarSign size={12} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-800">{spotCarrier.carrier}</span>
          </div>
          <span className="text-[10px] font-bold text-red-600">+{pctDelta.toFixed(0)}% above contract</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-[10px] text-gray-700 mb-2">
          <div>
            <div className="text-gray-400">Spot Rate</div>
            <div className="font-mono font-semibold text-red-600">${spotCarrier.rate.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-400">Contract Rate</div>
            <div className="font-mono font-semibold text-green-700">${spotCarrier.contractRate.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-400">Delta</div>
            <div className="font-mono font-semibold text-amber-700">+${delta.toLocaleString()}</div>
          </div>
        </div>

        {/* Rate Tolerance Control */}
        <div className="rounded-lg border border-gray-200 bg-white p-2.5 mb-2">
          <div className="flex items-center gap-1.5 mb-2">
            <Gauge size={10} className="text-gray-500" />
            <span className="text-[10px] font-semibold text-gray-600">Rate Tolerance Threshold</span>
          </div>
          <div className="flex items-center gap-1.5 mb-1.5">
            {[5, 10, 15].map((t) => (
              <button
                key={t}
                onClick={() => setTolerance(t)}
                className={cn(
                  "px-2.5 py-1 rounded text-[10px] font-bold transition-colors",
                  tolerance === t
                    ? "bg-blue-600 text-white"
                    : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                )}
              >
                {t}%
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-gray-400">Auto-approve if within {tolerance}% of contract rate</span>
            <span className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded",
              withinTolerance ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}>
              {withinTolerance ? "Within Tolerance" : "Exceeds Tolerance"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onApprove("Authorize Spot Booking", `Authorized ${spotCarrier.carrier} at $${spotCarrier.rate} (+${pctDelta.toFixed(0)}%)`)}
            className="text-[10px] font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded px-2.5 py-1 flex items-center gap-1 transition-colors"
          >
            <ThumbsUp size={10} /> Authorize
          </button>
          <button
            onClick={() => onOverride("Negotiate Rate", `Negotiate ${spotCarrier.carrier} rate closer to contract $${spotCarrier.contractRate}`)}
            className="text-[10px] font-semibold text-amber-700 border border-amber-300 hover:bg-amber-50 rounded px-2.5 py-1 flex items-center gap-1 transition-colors"
          >
            <BarChart3 size={10} /> Negotiate
          </button>
          <button
            onClick={() => onOverride("Reject Spot Rate", `Rejected ${spotCarrier.carrier} spot rate — seeking alternatives`)}
            className="text-[10px] font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded px-2.5 py-1 flex items-center gap-1 transition-colors"
          >
            <ThumbsDown size={10} /> Reject
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Notify / Carrier Inquiry Compose Modal ──────────────────────────────

function NotifyComposeModal({ booking: s, composeType, onClose, onSend }: {
  booking: Shipment
  composeType: "plant" | "carrier"
  onClose: () => void
  onSend: (body: string) => void
}) {
  const isCarrier = composeType === "carrier"
  const recipient = isCarrier
    ? (CARRIER_OPS[s.id] ?? { name: s.carrier, email: "ops@carrier.com" })
    : getRecipient(s.id)
  const subject = isCarrier
    ? `Booking Inquiry — ${s.id} — ${s.exceptionType}`
    : `Booking Exception — ${s.id} — ${s.exceptionType}`
  const defaultBody = isCarrier ? buildCarrierInquiryBody(s) : buildNotifyBody(s, recipient.name)
  const [body, setBody] = useState(defaultBody)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {isCarrier ? <PhoneCall size={15} className="text-amber-600" /> : <Send size={15} className="text-blue-600" />}
            <span className="text-sm font-semibold text-gray-800">
              {isCarrier ? "Query Carrier" : "Notify Plant Team"}
            </span>
            <span className="text-[11px] text-gray-400 ml-1">&mdash; {s.id}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">To</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
              <span className="text-xs font-medium text-gray-700">{recipient.name}</span>
              <span className="text-[11px] text-gray-400">&lt;{recipient.email}&gt;</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Subject</label>
            <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
              <span className="text-xs text-gray-700">{subject}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
            <span className="text-[10px] font-mono font-bold text-blue-700">{s.id}</span>
            <span className="text-[10px] text-blue-600">
              {s.carrier} &middot; {s.lane}
            </span>
            <ExceptionBadge type={s.exceptionType} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={13}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-700 font-sans leading-relaxed resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSend(body)}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors",
              isCarrier ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            <Send size={11} />
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Escalate Modal ──────────────────────────────────────────────────────

function EscalateModal({ booking: s, onClose, onSend }: {
  booking: Shipment
  onClose: () => void
  onSend: (body: string) => void
}) {
  const [body, setBody] = useState(buildEscalationBody(s))
  const recipient = ESCALATION_RECIPIENTS[s.id] ?? { name: "VP Operations", email: "vp-ops@company.com" }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-red-100 bg-red-50/40">
          <div className="flex items-center gap-2">
            <AlertOctagon size={15} className="text-red-600" />
            <span className="text-sm font-semibold text-red-800">Escalate Booking</span>
            <span className="text-[11px] text-red-400 ml-1">&mdash; {s.id}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
            <AlertOctagon size={12} className="text-red-600 shrink-0" />
            <span className="text-[11px] text-red-700 font-medium">
              Escalation will notify VP Operations and be logged in the Sent folder
            </span>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">To</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
              <span className="text-xs font-medium text-gray-700">{recipient.name}</span>
              <span className="text-[11px] text-gray-400">&lt;{recipient.email}&gt;</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Subject</label>
            <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
              <span className="text-xs text-gray-700">Escalation &mdash; {s.id} &mdash; {s.severity} {s.exceptionType}</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={13}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-700 font-sans leading-relaxed resize-none focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSend(body)}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 flex items-center gap-1.5 transition-colors"
          >
            <AlertOctagon size={11} />
            Escalate
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reroute / Alternate Carrier Panel ───────────────────────────────────

function ReroutePanel({ booking, approvedId, onClose, onApprove }: {
  booking: Shipment
  approvedId: string | null
  onClose: () => void
  onApprove: (option: RerouteOption) => void
}) {
  const options = REROUTE_OPTIONS[booking.id]
  const [selected, setSelected] = useState<string | null>(approvedId)

  if (!options) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-800">Alternate Carriers</span>
            <button onClick={onClose}><X size={16} className="text-gray-400" /></button>
          </div>
          <p className="text-sm text-gray-500">No alternate carrier options available for this booking.</p>
        </div>
      </div>
    )
  }

  const selectedOption = options.find((o) => o.id === selected)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <GitBranch size={15} className="text-blue-600" />
            <span className="text-sm font-semibold text-gray-800">Alternate Carrier Selection</span>
            <span className="text-[11px] text-gray-400 ml-1">&mdash; {booking.id}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Context bar */}
        <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-[11px] text-amber-800">
          <Zap size={11} className="text-amber-500 shrink-0" />
          <span>
            <strong>{booking.exceptionType}</strong> &mdash; {EXCEPTION_DESCRIPTIONS[booking.exceptionType]} on {booking.lane}
          </span>
        </div>

        {/* Options */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {options.map((opt) => {
            const isSelected = selected === opt.id
            const isApproved = approvedId === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => !approvedId && setSelected(isSelected ? null : opt.id)}
                disabled={!!approvedId || !opt.available}
                className={cn(
                  "w-full text-left rounded-xl border p-4 transition-all",
                  isApproved
                    ? "border-green-400 bg-green-50"
                    : isSelected
                    ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
                    : !opt.available
                    ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                    : "border-gray-200 bg-gray-50/40 hover:border-blue-300 hover:bg-blue-50/20"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-xs font-bold",
                        isApproved ? "text-green-700" : isSelected ? "text-blue-700" : "text-gray-700"
                      )}>
                        {opt.carrier}
                      </span>
                      {isApproved && (
                        <span className="text-[9px] font-bold bg-green-600 text-white rounded-full px-1.5 py-0.5 flex items-center gap-1">
                          <CheckCircle size={8} /> Approved
                        </span>
                      )}
                      {!opt.available && (
                        <span className="text-[9px] font-semibold text-gray-500 bg-gray-200 rounded-full px-1.5 py-0.5">
                          Unavailable
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-600 font-mono mb-1">{opt.route}</div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div className="text-xs font-bold text-gray-700">{opt.transitDays}d transit</div>
                    <div className="text-[11px] font-mono text-gray-600">${opt.rate.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-400">{opt.savings}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <div className="text-[11px] text-gray-400">
            {approvedId
              ? "Carrier approved \u2014 notification sent"
              : selected
              ? `Selected: ${options.find((o) => o.id === selected)?.carrier ?? ""}`
              : "Select a carrier to approve"}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors">
              {approvedId ? "Close" : "Cancel"}
            </button>
            {!approvedId && selectedOption && (
              <button
                onClick={() => onApprove(selectedOption)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle size={11} />
                Approve Carrier
                <ChevronRight size={11} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Carrier Policy Section ──────────────────────────────────────────────

function CarrierPolicySection({ carrier, booking }: { carrier: string; booking: Shipment }) {
  const [expanded, setExpanded] = useState(false)
  const policy = CARRIER_POLICIES[carrier]
  if (!policy) return null

  return (
    <div className="mb-2" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700"
      >
        <ClipboardList size={10} />
        Carrier Policy
        <ChevronRight size={10} className={cn("transition-transform", expanded ? "rotate-90" : "")} />
      </button>
      {expanded && (
        <div className="mt-1.5 rounded-lg border border-indigo-100 bg-indigo-50/30 p-2.5 space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
            <div><span className="text-gray-400">Max Weight:</span> <span className="font-semibold text-gray-700">{(policy.maxWeightKg / 1000).toFixed(0)}T per container</span></div>
            <div><span className="text-gray-400">Booking Cutoff:</span> <span className="font-semibold text-gray-700">{policy.bookingCutoffHours}h before sailing</span></div>
            <div className="col-span-2"><span className="text-gray-400">Equipment:</span> <span className="font-semibold text-gray-700">{policy.equipmentTypes.join(", ")}</span></div>
            <div className="col-span-2"><span className="text-gray-400">Prohibited:</span> <span className="font-semibold text-red-600">{policy.prohibitedCargo.join(", ")}</span></div>
          </div>
          {policy.specialNotes && (
            <p className="text-[9px] text-indigo-600 italic">{policy.specialNotes}</p>
          )}

          {/* AI Analysis */}
          <div className="rounded bg-white border border-indigo-200 p-2">
            <div className="flex items-center gap-1 mb-1">
              <Brain size={9} className="text-indigo-500" />
              <span className="text-[9px] font-bold text-indigo-700">AI Analysis</span>
            </div>
            <p className="text-[9px] text-gray-600 leading-relaxed">
              Agent analysis: Shipment rejected by {carrier}. Review policy constraints above.
              Recommend: (1) Check alternate carriers meeting weight/equipment requirements,
              (2) Contact {carrier} for exception approval if within threshold.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Missing Fields Modal ───────────────────────────────────────────────

function MissingFieldsModal({ booking: s, onClose, onSave }: {
  booking: Shipment
  onClose: () => void
  onSave: (booking: Shipment) => void
}) {
  const fields = s.missingFields ?? []
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.field, ""]))
  )
  const [pulling, setPulling] = useState(false)
  const [filled, setFilled] = useState(false)
  const [followUp, setFollowUp] = useState("none")
  const [customDate, setCustomDate] = useState("")

  const handlePullSAP = () => {
    setPulling(true)
    setTimeout(() => {
      setPulling(false)
      setFilled(true)
      const newValues: Record<string, string> = {}
      fields.forEach((f) => {
        newValues[f.field] = f.mockValue ?? ""
      })
      setValues(newValues)
    }, 1500)
  }

  const allFilled = fields.filter((f) => f.required).every((f) => values[f.field]?.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-indigo-100 bg-indigo-50/40">
          <div className="flex items-center gap-2">
            <FileWarning size={15} className="text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-800">Complete Missing Fields</span>
            <span className="text-[11px] text-indigo-400 ml-1">&mdash; {s.id}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
            <Brain size={11} className="text-amber-600 shrink-0" />
            <span className="text-[10px] text-amber-700 font-medium">
              SAP TM record is missing {fields.length} mandatory field{fields.length > 1 ? "s" : ""}. Populate below or pull from SAP.
            </span>
          </div>

          {/* Fields */}
          <div className="space-y-2.5">
            {fields.map((f) => (
              <div key={f.field}>
                <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  {f.label}
                  {f.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                  value={values[f.field] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.field]: e.target.value }))}
                  placeholder={f.mockValue ? `e.g. ${f.mockValue}` : ""}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-xs text-gray-700 focus:outline-none focus:ring-1 transition-colors",
                    filled ? "border-green-300 bg-green-50 focus:border-green-400 focus:ring-green-400" : "border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                  )}
                />
              </div>
            ))}
          </div>

          {/* Pull from SAP button */}
          <button
            onClick={handlePullSAP}
            disabled={pulling || filled}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors",
              filled
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            )}
          >
            {pulling ? (
              <><Loader2 size={12} className="animate-spin" /> Pulling from SAP TM...</>
            ) : filled ? (
              <><CheckCircle size={12} /> Fields populated from SAP</>
            ) : (
              <><RefreshCw size={12} /> Pull from SAP TM</>
            )}
          </button>

          {/* Follow-up scheduling */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Follow-up Reminder</label>
            <select
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            >
              <option value="none">No follow-up</option>
              <option value="tomorrow">Tomorrow 9:00 AM</option>
              <option value="2days">In 2 days</option>
              <option value="1week">In 1 week</option>
              <option value="custom">Custom date</option>
            </select>
            {followUp === "custom" && (
              <div className="mt-1.5 flex items-center gap-2">
                <Calendar size={12} className="text-gray-400" />
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-blue-400"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave(s)}
            disabled={!allFilled}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle size={11} />
            Save &amp; Resume Workflow
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reusable Components ─────────────────────────────────────────────────

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="text-gray-400">{label}:</span>
      <span className={cn("text-gray-700", mono ? "font-mono" : "font-medium")}>{value}</span>
    </div>
  )
}

function WorkbenchAction({ label, done, icon, onClick, variant }: {
  label: string
  done?: boolean
  icon: React.ReactNode
  onClick: () => void
  variant: "primary" | "secondary" | "danger" | "warning" | "success" | "route"
}) {
  const styles: Record<string, string> = {
    primary: done
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-blue-600 text-white hover:bg-blue-700 border-transparent",
    secondary: done
      ? "bg-green-50 text-green-700 border-green-200"
      : "border-gray-300 text-gray-600 hover:bg-gray-50",
    danger: done
      ? "bg-orange-50 text-orange-700 border-orange-200"
      : "border-red-200 text-red-600 hover:bg-red-50",
    warning: done
      ? "bg-green-50 text-green-700 border-green-200"
      : "border-amber-300 text-amber-700 hover:bg-amber-50",
    success: done
      ? "bg-green-100 text-green-800 border-green-300"
      : "border-green-400 text-green-700 bg-green-50 hover:bg-green-100",
    route: done
      ? "bg-green-50 text-green-700 border-green-200"
      : "border-indigo-300 text-indigo-700 hover:bg-indigo-50",
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      disabled={done}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors",
        styles[variant]
      )}
    >
      {done ? <CheckCircle size={11} /> : icon}
      {label}
    </button>
  )
}

function FilterPills<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: T[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mr-0.5">{label}:</span>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
            value === o ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
